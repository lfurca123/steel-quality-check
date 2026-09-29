export type OkNok = "OK" | "NOK";
export type TakNie = "TAK" | "NIE";

export const F1_MAX = 2.0;
export const F2_MAX = 5.0;
export const DEFAULT_SHIFT_TIMEZONE =
  typeof process !== "undefined" && process.env?.VITE_SHIFT_TIMEZONE
    ? process.env.VITE_SHIFT_TIMEZONE
    : "Europe/Warsaw";

export function rangeResult(value: number, max: number): OkNok {
  return value >= 0 && value <= max ? "OK" : "NOK";
}

export function finalResult(f1: OkNok, f2: OkNok, f3: OkNok, zg: TakNie): OkNok {
  return f1 === "OK" && f2 === "OK" && f3 === "OK" && zg === "TAK" ? "OK" : "NOK";
}

/** Shift from local Polish time. I: 06–14, II: 14–22, else "Poza zmianą". */
export function shiftFor(date: Date): string {
  const timezone = DEFAULT_SHIFT_TIMEZONE;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(date),
  );
  if (hour >= 6 && hour < 14) return "I zmiana";
  if (hour >= 14 && hour < 22) return "II zmiana";
  return "Poza zmianą";
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: DEFAULT_SHIFT_TIMEZONE,
  }).format(new Date(iso));
}

export type Inspection = {
  id: string;
  product: string;
  product_number: string;
  inspected_at: string;
  shift: string;
  inspector_name: string;
  f1_value: number;
  f1_result: OkNok;
  f2_value: number;
  f2_result: OkNok;
  f3_result: OkNok;
  zgodne: TakNie;
  final_result: OkNok;
};
