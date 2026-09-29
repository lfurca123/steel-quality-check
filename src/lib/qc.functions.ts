import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { finalResult, rangeResult, shiftFor, type Inspection } from "./qc";
import {
  createSessionToken,
  verifySessionToken,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  constantTimeCompare,
  sanitizeProductNumber,
  sanitizeSearchQuery,
} from "./security";

const pinSchema = z.string().regex(/^\d{4,8}$/, "PIN musi składać się z 4 do 8 cyfr");

function getClientIdentifier(): string {
  try {
    const req = getRequest();
    const forwarded = req?.headers?.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown-client";
    const realIp = req?.headers?.get("x-real-ip");
    if (realIp) return realIp.trim();
    return "client-default";
  } catch {
    return "client-default";
  }
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function verifyPin(pin: string) {
  const db = await admin();
  const { data } = await db
    .from("employees")
    .select("id, full_name, pin")
    .eq("pin", pin)
    .maybeSingle();

  if (!data) return null;
  const match = constantTimeCompare(String((data as { pin?: string }).pin ?? ""), pin);
  if (!match) return null;

  return {
    id: String((data as { id: string }).id),
    full_name: String((data as { full_name: string }).full_name),
  };
}

async function authenticateCaller(authData: { token?: string; pin?: string }) {
  if (authData.token) {
    const session = verifySessionToken(authData.token);
    if (session) {
      return { id: session.inspectorId, full_name: session.inspectorName };
    }
  }
  if (authData.pin) {
    const emp = await verifyPin(authData.pin);
    if (emp) return emp;
  }
  return null;
}

export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ pin: pinSchema }).parse(d))
  .handler(async ({ data }) => {
    const clientId = getClientIdentifier();
    const rateStatus = checkRateLimit(clientId);

    if (!rateStatus.allowed) {
      const waitMin = Math.ceil((rateStatus.retryAfterSeconds ?? 300) / 60);
      return {
        ok: false as const,
        error: `Zbyt wiele nieudanych prób logowania. Odczekaj ${waitMin} min.`,
      };
    }

    const emp = await verifyPin(data.pin);
    if (!emp) {
      recordFailedAttempt(clientId);
      return { ok: false as const, error: "Nieprawidłowy PIN" };
    }

    clearRateLimit(clientId);
    const token = createSessionToken({
      inspectorId: emp.id,
      inspectorName: emp.full_name,
    });

    return {
      ok: true as const,
      id: emp.id,
      name: emp.full_name,
      token,
    };
  });

const pieceSchema = z.object({
  productNumber: z
    .string()
    .trim()
    .min(1, "Numer produktu nie może być pusty")
    .max(50, "Numer produktu nie może być dłuższy niż 50 znaków")
    .regex(/^[\w\s\-./]+$/, "Numer produktu zawiera niedozwolone znaki"),
  f1: z
    .number()
    .min(0, "Wartość F1 nie może być ujemna")
    .max(999, "Wartość F1 przekracza dopuszczalny limit"),
  f2: z
    .number()
    .min(0, "Wartość F2 nie może być ujemna")
    .max(999, "Wartość F2 przekracza dopuszczalny limit"),
  f3: z.enum(["OK", "NOK"]),
  zgodne: z.enum(["TAK", "NIE"]),
});

export const saveSkoInspections = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: z.string().optional(),
        pin: pinSchema.optional(),
        pieces: z.array(pieceSchema).length(4, "Kontrola wymaga podania dokładnie 4 sztuk"),
      })
      .refine((val) => Boolean(val.token || val.pin), {
        message: "Wymagane uwierzytelnienie (token lub PIN)",
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const emp = await authenticateCaller({ token: data.token, pin: data.pin });
    if (!emp) throw new Error("Sesja wygasła lub nieprawidłowe uwierzytelnienie");

    const now = new Date();
    const rows = data.pieces.map((p) => {
      const f1 = Math.round(p.f1 * 10) / 10;
      const f2 = Math.round(p.f2 * 10) / 10;
      const f1r = rangeResult(f1, 2.0);
      const f2r = rangeResult(f2, 5.0);
      const sanitizedNumber = sanitizeProductNumber(p.productNumber);

      return {
        product: "SKO",
        product_number: sanitizedNumber,
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
      .from("sko_inspections")
      .insert(rows)
      .select("product_number, final_result");

    if (error) throw new Error("Błąd zapisu danych kontroli");
    return saved;
  });

export const searchInspections = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: z.string().optional(),
        pin: pinSchema.optional(),
        query: z.string().trim().max(50).optional(),
      })
      .refine((val) => Boolean(val.token || val.pin), {
        message: "Wymagane uwierzytelnienie (token lub PIN)",
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const emp = await authenticateCaller({ token: data.token, pin: data.pin });
    if (!emp) throw new Error("Sesja wygasła lub brak autoryzacji");

    const db = await admin();
    let q = db.from("sko_inspections").select("*").order("inspected_at", { ascending: false });

    if (data.query) {
      const safe = sanitizeSearchQuery(data.query);
      if (safe.length > 0) {
        q = q.ilike("product_number", `%${safe}%`).limit(100);
      } else {
        q = q.limit(10);
      }
    } else {
      q = q.limit(10);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error("Błąd wyszukiwania kontroli");
    return rows as unknown as Inspection[];
  });
