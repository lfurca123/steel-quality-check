import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchInspections from "./tools/search-inspections";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "steel-quality-check",
  title: "Steel Quality Check",
  version: "0.1.0",
  instructions:
    "Read-only access to SKO steel quality inspections. Use `search_inspections` to find inspections by product number or list the latest ones.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchInspections],
});
