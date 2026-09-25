import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { finalResult, rangeResult, shiftFor, type Inspection } from "./qc";

const pinSchema = z.string().regex(/^\d{4,8}$/);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function verifyPin(pin: string) {
  const db = await admin();
  const { data } = await db.from("employees").select("id, full_name").eq("pin", pin).maybeSingle();
  return data;
}

export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ pin: pinSchema }).parse(d))
  .handler(async ({ data }) => {
    const emp = await verifyPin(data.pin);
    if (!emp) return { ok: false as const };
    return { ok: true as const, id: emp.id, name: emp.full_name };
  });

const pieceSchema = z.object({
  productNumber: z.string().trim().min(1).max(50),
  f1: z.number().min(0).max(999),
  f2: z.number().min(0).max(999),
  f3: z.enum(["OK", "NOK"]),
  zgodne: z.enum(["TAK", "NIE"]),
});

export const saveSkoInspections = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ pin: pinSchema, pieces: z.array(pieceSchema).length(4) }).parse(d),
  )
  .handler(async ({ data }) => {
    const emp = await verifyPin(data.pin);
    if (!emp) throw new Error("Nieprawidłowy PIN");
    const now = new Date();
    const rows = data.pieces.map((p) => {
      const f1 = Math.round(p.f1 * 10) / 10;
      const f2 = Math.round(p.f2 * 10) / 10;
      const f1r = rangeResult(f1, 2.0);
      const f2r = rangeResult(f2, 5.0);
      return {
        product: "SKO",
        product_number: p.productNumber,
        inspected_at: now.toISOString(),
        shift: shiftFor(now),
        inspector_id: emp.id,
        inspector_name: emp.full_name,
        f1_value: f1,
        f1_result: f1r,
        f2_value: f2,
        f2_result: f2r,
        f3_result: p.f3,
        zgodne: p.zgodne,
        final_result: finalResult(f1r, f2r, p.f3, p.zgodne),
      };
    });
    const db = await admin();
    const { data: saved, error } = await db
      .from("inspections")
      .insert(rows)
      .select("product_number, final_result");
    if (error) throw new Error("Błąd zapisu");
    return saved;
  });

export const searchInspections = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ pin: pinSchema, query: z.string().trim().max(50).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!(await verifyPin(data.pin))) throw new Error("Nieprawidłowy PIN");
    const db = await admin();
    let q = db.from("inspections").select("*").order("inspected_at", { ascending: false });
    if (data.query) {
      const safe = data.query.replace(/[%_\\,()]/g, "");
      q = q.ilike("product_number", `%${safe}%`).limit(100);
    } else {
      q = q.limit(10);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error("Błąd wyszukiwania");
    return rows as unknown as Inspection[];
  });
