import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MigraLogo from "@/components/MigraLogo";

function safeNext(n: unknown) {
  return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s["next"]) }),
  head: () => ({
    meta: [
      { title: "Logowanie — Migra" },
      { name: "description", content: "Logowanie do systemu kontroli jakości Migra." },
      { property: "og:title", content: "Logowanie — Migra" },
      {
        property: "og:description",
        content: "Połącz asystenta AI z danymi kontroli jakości Migra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg(error.message);
      window.location.href = next;
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + next },
      });
      setBusy(false);
      setMsg(error ? error.message : "Sprawdź skrzynkę e-mail, aby potwierdzić konto.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 border-t-8 border-primary p-6">
      <MigraLogo className="mb-5 h-16 w-auto self-start" />
      <h1 className="text-2xl font-bold text-foreground">
        {mode === "in" ? "Zaloguj się" : "Utwórz konto"}
      </h1>
      <p className="text-sm text-muted-foreground">
        Konto służy do połączenia asystenta AI z danymi kontroli (tylko odczyt).
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className="rounded-md border border-input bg-background p-3 text-foreground"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded-md border border-input bg-background p-3 text-foreground"
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button
          disabled={busy}
          className="rounded-md bg-primary p-3 font-semibold text-primary-foreground"
        >
          {mode === "in" ? "Zaloguj" : "Zarejestruj"}
        </button>
      </form>
      {msg && (
        <p role="alert" className="text-sm text-foreground">
          {msg}
        </p>
      )}
      <button
        className="text-sm text-muted-foreground underline"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? "Nie masz konta? Zarejestruj się" : "Masz konto? Zaloguj się"}
      </button>
      <button
        className="text-sm text-muted-foreground underline"
        onClick={() => navigate({ to: "/" })}
      >
        Wróć
      </button>
    </main>
  );
}
