import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_inspections",
  title: "Wyszukaj kontrole",
  description:
    "Search saved SKO quality inspections by (partial) product number; without a query returns the latest ones.",
  inputSchema: {
    query: z.string().trim().max(50).optional().describe("Part of product number, e.g. 00103."),
    limit: z.number().int().min(1).max(100).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const db = supabaseForUser(ctx);
    let q = db
      .from("sko_inspections")
      .select(
        "id, product, product_number, inspected_at, shift, inspector_name, f1_value, f1_result, f2_value, f2_result, f3_result, zgodne, final_result",
      )
      .order("inspected_at", { ascending: false })
      .limit(limit ?? 10);
    if (query) q = q.ilike("product_number", `%${query.replace(/[%_\\,()]/g, "")}%`);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const rows = (data ?? []).map((r) => ({
      id: r.id,
      product: r.product,
      product_number: r.product_number,
      inspected_at: r.inspected_at,
      shift: r.shift,
      inspector: r.inspector_name,
      f1: { value: Number(r.f1_value), result: r.f1_result },
      f2: { value: Number(r.f2_value), result: r.f2_result },
      f3: r.f3_result,
      zgodne: r.zgodne,
      final_result: r.final_result,
    }));
    return {
      content: [
        {
          type: "text",
          text: rows.length
            ? JSON.stringify(rows)
            : "Brak wyników (lub konto nie ma uprawnień do odczytu kontroli).",
        },
      ],
      structuredContent: { inspections: rows },
    };
  },
});
