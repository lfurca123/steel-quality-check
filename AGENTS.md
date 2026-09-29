<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- MCP server lives in src/lib/mcp (read-only tools, Supabase OAuth); inspections readable only by accounts with viewer/admin role in user_roles — keeps AI access least-privilege.
- Reuse `MigraLogo` for every branded screen and source it from the uploaded official SVG asset — keeps the company mark consistent and centrally replaceable.
