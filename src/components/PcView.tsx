import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchInspections } from "@/lib/qc.functions";
import { formatDate, type Inspection } from "@/lib/qc";
import MigraLogo from "@/components/MigraLogo";

/**
 * Widok komputerowy — WYŁĄCZNIE do odczytu.
 * Brak dodawania, edycji i usuwania kontroli.
 */
export default function PcView({ pin, userName, onLogout }: { pin: string; userName: string; onLogout: () => void }) {
  const search = useServerFn(searchInspections);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Inspection[] | null>(null);
  const [label, setLabel] = useState("10 ostatnich kontroli");
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Inspection | null>(null);

  const run = async (query?: string) => {
    setErr("");
    setRows(null);
    try {
      const r = await search({ data: { pin, query: query || undefined } });
      setRows(r);
      setLabel(query ? `Wyniki dla „${query}”` : "10 ostatnich kontroli");
    } catch {
      setErr("Błąd wyszukiwania");
      setRows([]);
    }
  };

  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-4">
            <MigraLogo className="h-11 w-auto" />
            <div className="border-l border-border pl-4">
              <div className="font-display text-lg font-bold uppercase text-secondary">Kontrola jakości — przegląd</div>
              <div className="text-xs text-muted-foreground">Zalogowany: {userName} · tryb tylko do odczytu</div>
            </div>
          </div>
          <button onClick={onLogout} className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-secondary hover:bg-muted">
            Wyloguj
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_22rem]">
        <section>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(q.trim()); }}>
            <input
              className="h-12 flex-1 rounded-md border border-input bg-card px-4"
              placeholder="Numer produktu, np. 00103"
              value={q}
              maxLength={50}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="h-12 rounded-md bg-primary px-6 font-display font-bold text-primary-foreground">
              SZUKAJ
            </button>
          </form>

          <h3 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">{label}</h3>
          {err && <p className="text-sm text-nok">{err}</p>}

          {rows === null ? (
            <p className="text-sm text-muted-foreground">Ładowanie…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak kontroli.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Data</th>
                    <th className="px-4 py-2 font-semibold">Numer</th>
                    <th className="px-4 py-2 font-semibold">Zmiana</th>
                    <th className="px-4 py-2 font-semibold">Kontroler</th>
                    <th className="px-4 py-2 font-semibold">Wynik</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`cursor-pointer border-t border-border bg-card hover:bg-muted ${selected?.id === r.id ? "bg-muted" : ""}`}
                    >
                      <td className="px-4 py-2 text-muted-foreground">{formatDate(r.inspected_at)}</td>
                      <td className="px-4 py-2 font-semibold">{r.product_number}</td>
                      <td className="px-4 py-2">{r.shift}</td>
                      <td className="px-4 py-2">{r.inspector_name}</td>
                      <td className="px-4 py-2"><Badge value={r.final_result} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Szczegóły kontroli</h3>
          {selected ? (
            <dl className="divide-y divide-border rounded-md border border-border bg-card">
              {details(selected).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <dt className="text-sm text-muted-foreground">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              Wybierz kontrolę z listy, aby zobaczyć szczegóły.
            </p>
          )}
        </aside>
      </main>
    </div>
  );
}

function details(r: Inspection): [string, React.ReactNode][] {
  return [
    ["Produkt", r.product],
    ["Numer", r.product_number],
    ["Data", formatDate(r.inspected_at)],
    ["Zmiana", r.shift],
    ["Kontroler", r.inspector_name],
    ["F1", <span key="f1" className="flex items-center justify-end gap-2">{Number(r.f1_value).toFixed(1)} mm <Badge value={r.f1_result} /></span>],
    ["F2", <span key="f2" className="flex items-center justify-end gap-2">{Number(r.f2_value).toFixed(1)} mm <Badge value={r.f2_result} /></span>],
    ["F3", <Badge key="f3" value={r.f3_result} />],
    ["Zgodne", <Badge key="z" value={r.zgodne} />],
    ["Wynik końcowy", <Badge key="w" value={r.final_result} />],
  ];
}

function Badge({ value }: { value: string }) {
  const good = value === "OK" || value === "TAK";
  return (
    <span className={`inline-block min-w-12 rounded px-2 py-1 text-center text-xs font-bold ${good ? "bg-ok text-ok-foreground" : "bg-nok text-nok-foreground"}`}>
      {value}
    </span>
  );
}
