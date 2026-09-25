import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { loginWithPin, saveSkoInspections, searchInspections } from "@/lib/qc.functions";
import {
  F1_MAX,
  F2_MAX,
  finalResult,
  formatDate,
  rangeResult,
  type Inspection,
  type OkNok,
  type TakNie,
} from "@/lib/qc";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kontrola Jakości SKO" },
      { name: "description", content: "Wykonywanie i wyszukiwanie kontroli jakości produktów SKO." },
      { property: "og:title", content: "Kontrola Jakości SKO" },
      { property: "og:description", content: "Wykonywanie i wyszukiwanie kontroli jakości produktów SKO." },
    ],
  }),
  component: App,
});

type User = { id: string; name: string; pin: string };
type Piece = { number: string; f1: string; f2: string; f3: OkNok | null; zgodne: TakNie | null };
type Screen =
  | "home" | "product" | "numbers" | "measure" | "f3" | "zgodne" | "summary" | "saved" | "search" | "detail";

const emptyPieces = (): Piece[] =>
  Array.from({ length: 4 }, () => ({ number: "", f1: "", f2: "", f3: null, zgodne: null }));

const parseNum = (s: string) => Number(s.replace(",", "."));
const validMeasure = (s: string) => /^\d{1,3}([.,]\d)?$/.test(s.trim());

function useIsMobile() {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const upd = () => setMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);
  return mobile;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [pieces, setPieces] = useState<Piece[]>(emptyPieces);
  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState<{ product_number: string; final_result: string }[]>([]);
  const [detail, setDetail] = useState<Inspection | null>(null);
  const [scanIdx, setScanIdx] = useState<number | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const s = sessionStorage.getItem("qc-user");
    if (s) setUser(JSON.parse(s));
  }, []);

  const logout = () => {
    sessionStorage.removeItem("qc-user");
    setUser(null);
    setScreen("home");
  };

  if (!user) return <Login onLogin={(u) => { sessionStorage.setItem("qc-user", JSON.stringify(u)); setUser(u); }} />;

  const canInspect = isMobile === true;
  const update = (i: number, p: Partial<Piece>) =>
    setPieces((prev) => prev.map((x, j) => (j === i ? { ...x, ...p } : x)));

  let body: ReactNode = null;
  if (screen === "home") {
    body = (
      <div className="flex flex-col gap-4">
        {canInspect ? (
          <BigBtn onClick={() => { setPieces(emptyPieces()); setIdx(0); setScreen("product"); }}>NOWA KONTROLA</BigBtn>
        ) : (
          <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            Widok komputerowy: dostępne jest tylko wyszukiwanie i przeglądanie kontroli.
          </p>
        )}
        <BigBtn variant="dark" onClick={() => setScreen("search")}>WYSZUKAJ KONTROLĘ</BigBtn>
      </div>
    );
  } else if (screen === "product" && canInspect) {
    body = (
      <Step title="Wybierz produkt" onBack={() => setScreen("home")}>
        <div className="flex flex-col gap-3">
          <BigBtn onClick={() => setScreen("numbers")}>SKO</BigBtn>
          <BigBtn disabled>Produkt 1</BigBtn>
          <BigBtn disabled>Produkt 2</BigBtn>
        </div>
      </Step>
    );
  } else if (screen === "numbers" && canInspect) {
    const numbers = pieces.map((p) => p.number.trim());
    const dup = new Set(numbers.filter(Boolean)).size !== numbers.filter(Boolean).length;
    const ok = numbers.every(Boolean) && !dup;
    body = (
      <Step title="Numery produktów SKO" onBack={() => setScreen("product")}>
        <div className="flex flex-col gap-3">
          {pieces.map((p, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Sztuka {i + 1}</span>
              <div className="flex gap-2">
                <input
                  className="h-14 flex-1 rounded-md border border-input bg-card px-4 text-lg"
                  placeholder={`SKO-0010${i + 1}`}
                  value={p.number}
                  maxLength={50}
                  onChange={(e) => update(i, { number: e.target.value.toUpperCase() })}
                />
                <button
                  onClick={() => setScanIdx(i)}
                  className="h-14 rounded-md bg-secondary px-4 text-sm font-bold text-secondary-foreground"
                >
                  📷 Skanuj
                </button>
              </div>
            </div>
          ))}
          {dup && <p className="text-sm text-nok">Numery nie mogą się powtarzać.</p>}
          <BigBtn disabled={!ok} onClick={() => { setIdx(0); setScreen("measure"); }}>DALEJ</BigBtn>
        </div>
      </Step>
    );
  } else if (screen === "measure" && canInspect) {
    const p = pieces[idx]!;
    const ok = validMeasure(p.f1) && validMeasure(p.f2);
    body = (
      <Step
        title={`Sztuka ${idx + 1} z 4 · ${p.number}`}
        onBack={() => (idx === 0 ? setScreen("numbers") : setIdx(idx - 1))}
      >
        <div className="flex flex-col gap-4">
          <MeasureInput label="F1" max={F1_MAX} value={p.f1} onChange={(v) => update(idx, { f1: v })} />
          <MeasureInput label="F2" max={F2_MAX} value={p.f2} onChange={(v) => update(idx, { f2: v })} />
          <BigBtn disabled={!ok} onClick={() => (idx < 3 ? setIdx(idx + 1) : setScreen("f3"))}>
            {idx < 3 ? "NASTĘPNA SZTUKA" : "DALEJ"}
          </BigBtn>
        </div>
      </Step>
    );
  } else if (screen === "f3" && canInspect) {
    body = (
      <Step title="Kontrola F3" onBack={() => { setIdx(3); setScreen("measure"); }}>
        <ChoiceList
          pieces={pieces}
          options={["OK", "NOK"]}
          get={(p) => p.f3}
          set={(i, v) => update(i, { f3: v as OkNok })}
        />
        <BigBtn className="mt-4" disabled={pieces.some((p) => !p.f3)} onClick={() => setScreen("zgodne")}>DALEJ</BigBtn>
      </Step>
    );
  } else if (screen === "zgodne" && canInspect) {
    body = (
      <Step title="Zgodne" onBack={() => setScreen("f3")}>
        <ChoiceList
          pieces={pieces}
          options={["TAK", "NIE"]}
          get={(p) => p.zgodne}
          set={(i, v) => update(i, { zgodne: v as TakNie })}
        />
        <BigBtn className="mt-4" disabled={pieces.some((p) => !p.zgodne)} onClick={() => setScreen("summary")}>PODSUMOWANIE</BigBtn>
      </Step>
    );
  } else if (screen === "summary" && canInspect) {
    body = (
      <Summary
        user={user}
        pieces={pieces}
        onFix={() => { setIdx(0); setScreen("numbers"); }}
        onSaved={(s) => { setSaved(s); setScreen("saved"); }}
      />
    );
  } else if (screen === "saved") {
    body = (
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-3xl font-bold">Zapisano {saved.length} kontrole</h2>
        <ul className="flex flex-col gap-2">
          {saved.map((s) => (
            <li key={s.product_number} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
              <span className="font-semibold">{s.product_number}</span>
              <Badge value={s.final_result} />
            </li>
          ))}
        </ul>
        <BigBtn onClick={() => setScreen("home")}>EKRAN GŁÓWNY</BigBtn>
      </div>
    );
  } else if (screen === "search") {
    body = (
      <Search
        user={user}
        onBack={() => setScreen("home")}
        onOpen={(r) => { setDetail(r); setScreen("detail"); }}
      />
    );
  } else if (screen === "detail" && detail) {
    body = <Detail r={detail} onBack={() => setScreen("search")} />;
  } else {
    body = <BigBtn onClick={() => setScreen("home")}>EKRAN GŁÓWNY</BigBtn>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary text-secondary-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <div className="font-display text-xl font-bold tracking-wide">
              <span className="text-primary">■</span> KONTROLA JAKOŚCI
            </div>
            <div className="text-xs opacity-80">Zalogowany: {user.name}</div>
          </div>
          <button onClick={logout} className="rounded-md border border-secondary-foreground/30 px-3 py-2 text-sm">
            Wyloguj
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{body}</main>
      {scanIdx !== null && (
        <Scanner
          onClose={() => setScanIdx(null)}
          onConfirm={(num) => { update(scanIdx, { number: num }); setScanIdx(null); }}
        />
      )}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const login = useServerFn(loginWithPin);

  const submit = async (p: string) => {
    setBusy(true);
    setErr("");
    try {
      const r = await login({ data: { pin: p } });
      if (r.ok) onLogin({ id: r.id, name: r.name, pin: p });
      else { setErr("Nieprawidłowy PIN"); setPin(""); }
    } catch {
      setErr("Błąd połączenia");
    } finally {
      setBusy(false);
    }
  };

  const press = (d: string) => {
    if (busy) return;
    const next = (pin + d).slice(0, 8);
    setPin(next);
    if (next.length === 4) submit(next);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4 text-secondary-foreground">
      <h1 className="font-display text-4xl font-bold tracking-wide">
        <span className="text-primary">■</span> KONTROLA JAKOŚCI
      </h1>
      <p className="mt-2 opacity-80">Wpisz swój PIN</p>
      <div className="my-6 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-4 w-4 rounded-full ${i < pin.length ? "bg-primary" : "bg-secondary-foreground/25"}`} />
        ))}
      </div>
      <div className="h-6 text-sm text-nok">{err}</div>
      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeyBtn key={d} onClick={() => press(d)}>{d}</KeyBtn>
        ))}
        <KeyBtn onClick={() => setPin("")}>C</KeyBtn>
        <KeyBtn onClick={() => press("0")}>0</KeyBtn>
        <KeyBtn onClick={() => setPin(pin.slice(0, -1))}>⌫</KeyBtn>
      </div>
    </div>
  );
}

function KeyBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-16 rounded-md bg-secondary-foreground/10 font-display text-2xl font-bold active:bg-primary active:text-primary-foreground">
      {children}
    </button>
  );
}

function BigBtn({
  children, onClick, disabled, variant = "primary", className = "",
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "dark"; className?: string }) {
  const v = variant === "primary" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-16 w-full rounded-md font-display text-xl font-bold tracking-wide disabled:opacity-40 ${v} ${className}`}
    >
      {children}
    </button>
  );
}

function Step({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div>
      <button onClick={onBack} className="mb-3 text-sm font-semibold text-muted-foreground">← Wstecz</button>
      <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Badge({ value }: { value: string }) {
  const good = value === "OK" || value === "TAK";
  return (
    <span className={`inline-block min-w-12 rounded px-2 py-1 text-center text-sm font-bold ${good ? "bg-ok text-ok-foreground" : "bg-nok text-nok-foreground"}`}>
      {value}
    </span>
  );
}

function MeasureInput({ label, max, value, onChange }: { label: string; max: number; value: string; onChange: (v: string) => void }) {
  const valid = validMeasure(value);
  const res = valid ? rangeResult(parseNum(value), max) : null;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold">{label} [mm] · zakres 0,0–{max.toFixed(1).replace(".", ",")}</span>
      <div className="flex items-center gap-3">
        <input
          inputMode="decimal"
          className="h-16 flex-1 rounded-md border border-input bg-card px-4 text-2xl"
          placeholder="0,0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        />
        <div className="w-16">{res && <Badge value={res} />}</div>
      </div>
      {value && !valid && <span className="text-sm text-nok">Podaj wartość z dokładnością 0,1 mm</span>}
    </label>
  );
}

function ChoiceList({
  pieces, options, get, set,
}: { pieces: Piece[]; options: string[]; get: (p: Piece) => string | null; set: (i: number, v: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {pieces.map((p, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-3">
          <div className="mb-2 font-semibold">Sztuka {i + 1} · {p.number}</div>
          <div className="grid grid-cols-2 gap-2">
            {options.map((o, k) => {
              const active = get(p) === o;
              const color = k === 0 ? "bg-ok text-ok-foreground" : "bg-nok text-nok-foreground";
              return (
                <button
                  key={o}
                  onClick={() => set(i, o)}
                  className={`h-14 rounded-md font-display text-xl font-bold ${active ? color : "bg-muted text-muted-foreground"}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function computed(p: Piece) {
  const f1 = parseNum(p.f1), f2 = parseNum(p.f2);
  const f1r = rangeResult(f1, F1_MAX), f2r = rangeResult(f2, F2_MAX);
  return { f1, f2, f1r, f2r, final: finalResult(f1r, f2r, p.f3!, p.zgodne!) };
}

function Summary({
  user, pieces, onFix, onSaved,
}: { user: User; pieces: Piece[]; onFix: () => void; onSaved: (s: { product_number: string; final_result: string }[]) => void }) {
  const save = useServerFn(saveSkoInspections);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await save({
        data: {
          pin: user.pin,
          pieces: pieces.map((p) => ({
            productNumber: p.number.trim(),
            f1: parseNum(p.f1),
            f2: parseNum(p.f2),
            f3: p.f3!,
            zgodne: p.zgodne!,
          })),
        },
      });
      onSaved(r ?? []);
    } catch {
      setErr("Nie udało się zapisać. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 font-display text-2xl font-bold">Podsumowanie</h2>
      <div className="flex flex-col gap-3">
        {pieces.map((p, i) => {
          const c = computed(p);
          return (
            <div key={i} className="rounded-md border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">Sztuka {i + 1} · {p.number}</span>
                <span className="flex items-center gap-2 text-sm font-semibold">WYNIK <Badge value={c.final} /></span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Row label={`F1: ${c.f1.toFixed(1)} mm`} v={c.f1r} />
                <Row label={`F2: ${c.f2.toFixed(1)} mm`} v={c.f2r} />
                <Row label="F3" v={p.f3!} />
                <Row label="Zgodne" v={p.zgodne!} />
              </div>
            </div>
          );
        })}
      </div>
      {err && <p className="mt-3 text-sm text-nok">{err}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <BigBtn variant="dark" onClick={onFix} disabled={busy}>POPRAW DANE</BigBtn>
        <BigBtn onClick={confirm} disabled={busy}>{busy ? "ZAPISYWANIE…" : "ZATWIERDŹ"}</BigBtn>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-muted px-2 py-1">
      <span>{label}</span>
      <Badge value={v} />
    </div>
  );
}

function Search({ user, onBack, onOpen }: { user: User; onBack: () => void; onOpen: (r: Inspection) => void }) {
  const search = useServerFn(searchInspections);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Inspection[] | null>(null);
  const [label, setLabel] = useState("10 ostatnich kontroli");
  const [err, setErr] = useState("");

  const run = async (query?: string) => {
    setErr("");
    try {
      const r = await search({ data: { pin: user.pin, query: query || undefined } });
      setRows(r);
      setLabel(query ? `Wyniki dla „${query}”` : "10 ostatnich kontroli");
    } catch {
      setErr("Błąd wyszukiwania");
    }
  };

  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Step title="Wyszukaj kontrolę" onBack={onBack}>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(q.trim()); }}>
        <input
          className="h-14 flex-1 rounded-md border border-input bg-card px-4 text-lg"
          placeholder="Numer produktu, np. 00103"
          value={q}
          maxLength={50}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="h-14 rounded-md bg-primary px-5 font-display text-lg font-bold text-primary-foreground">SZUKAJ</button>
      </form>
      <h3 className="mb-2 mt-5 text-sm font-semibold text-muted-foreground">{label}</h3>
      {err && <p className="text-sm text-nok">{err}</p>}
      {rows === null ? (
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Brak kontroli.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id}>
              <button onClick={() => onOpen(r)} className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-border bg-card p-3 text-left sm:grid-cols-[9rem_1fr_10rem_auto]">
                <span className="text-sm text-muted-foreground">{formatDate(r.inspected_at)}</span>
                <span className="font-semibold">{r.product_number}</span>
                <span className="text-sm">{r.inspector_name}</span>
                <Badge value={r.final_result} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Step>
  );
}

function Detail({ r, onBack }: { r: Inspection; onBack: () => void }) {
  const items: [string, ReactNode][] = [
    ["Produkt", r.product],
    ["Numer", r.product_number],
    ["Data", formatDate(r.inspected_at)],
    ["Zmiana", r.shift],
    ["Kontroler", r.inspector_name],
    ["F1", <span key="f1" className="flex items-center gap-2">{Number(r.f1_value).toFixed(1)} mm <Badge value={r.f1_result} /></span>],
    ["F2", <span key="f2" className="flex items-center gap-2">{Number(r.f2_value).toFixed(1)} mm <Badge value={r.f2_result} /></span>],
    ["F3", <Badge key="f3" value={r.f3_result} />],
    ["Zgodne", <Badge key="z" value={r.zgodne} />],
    ["Wynik końcowy", <Badge key="w" value={r.final_result} />],
  ];
  return (
    <Step title={`Kontrola ${r.product_number}`} onBack={onBack}>
      <dl className="divide-y divide-border rounded-md border border-border bg-card">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </Step>
  );
}
