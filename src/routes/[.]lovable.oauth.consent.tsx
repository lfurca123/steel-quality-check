import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MigraLogo from "@/components/MigraLogo";

type OAuthResult = {
  data: {
    client?: { name?: string };
    redirect_url?: string;
    redirect_to?: string;
  } | null;
  error: { message: string } | null;
};
const oauth = (
  supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
      approveAuthorization: (id: string) => Promise<OAuthResult>;
      denyAuthorization: (id: string) => Promise<OAuthResult>;
    };
  }
).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Brak authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  head: () => ({
    meta: [
      { title: "Autoryzacja asystenta — Migra" },
      {
        name: "description",
        content: "Zatwierdź dostęp asystenta AI do danych kontroli jakości Migra.",
      },
      { property: "og:title", content: "Autoryzacja asystenta — Migra" },
      {
        property: "og:description",
        content: "Zatwierdź dostęp asystenta AI do danych kontroli jakości Migra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="p-6 text-foreground">
      Nie udało się wczytać żądania autoryzacji: {String(error?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? "Aplikacja";

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("Brak adresu powrotu.");
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 border-t-8 border-primary p-6">
      <MigraLogo className="mb-5 h-16 w-auto self-start" />
      <h1 className="text-2xl font-bold text-foreground">Połącz {name} z kontem</h1>
      <p className="text-muted-foreground">
        {name} będzie mógł odczytywać zapisane kontrole jakości w Twoim imieniu (tylko odczyt).
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          disabled={busy}
          onClick={() => decide(false)}
          className="flex-1 rounded-md border border-input p-3 text-foreground"
        >
          Odmów
        </button>
        <button
          disabled={busy}
          onClick={() => decide(true)}
          className="flex-1 rounded-md bg-primary p-3 font-semibold text-primary-foreground"
        >
          Zatwierdź
        </button>
      </div>
    </main>
  );
}
