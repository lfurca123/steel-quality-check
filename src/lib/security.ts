import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Klucz podpisywania tokenów sesji.
 * Pobierany z zmiennej środowiskowej QC_SESSION_SECRET lub generowany losowo w pamięci procesu.
 */
const SESSION_SECRET: string =
  (typeof process !== "undefined" && process.env?.["QC_SESSION_SECRET"]) ||
  randomBytes(32).toString("hex");

export interface SessionPayload {
  inspectorId: string;
  inspectorName: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Tworzy kryptograficznie podpisany token sesji (HMAC-SHA256).
 * Domyślny czas trwania: 12 godzin (pełna zmiana robocza z marginesem).
 */
export function createSessionToken(
  payload: { inspectorId: string; inspectorName: string },
  durationMs: number = 12 * 60 * 60 * 1000,
): string {
  const now = Date.now();
  const fullPayload: SessionPayload = {
    inspectorId: payload.inspectorId,
    inspectorName: payload.inspectorName,
    createdAt: now,
    expiresAt: now + durationMs,
  };

  const data = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Weryfikuje token sesji i sprawdza ważność czasową.
 * Zwraca zdekodowany SessionPayload lub null w przypadku niepowodzenia.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [dataPart, signaturePart] = parts;
  if (!dataPart || !signaturePart) return null;

  try {
    const expectedSignature = createHmac("sha256", SESSION_SECRET)
      .update(dataPart)
      .digest("base64url");

    const bufSig = Buffer.from(signaturePart);
    const bufExpected = Buffer.from(expectedSignature);

    if (bufSig.length !== bufExpected.length) return null;
    if (!timingSafeEqual(bufSig, bufExpected)) return null;

    const json = Buffer.from(dataPart, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as SessionPayload;

    if (!payload.inspectorId || !payload.inspectorName || !payload.expiresAt) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null; // Sesja wygasła
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Stałoczasowe porównywanie ciągów znaków (ochrona przed timing attacks na PIN).
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------------
// Rate Limiting dla prób logowania PIN-em
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minut
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minut blokady po przekroczeniu limitu

/**
 * Sprawdza, czy dany identyfikator (np. IP klienta) nie przekroczył limitu prób logowania.
 */
export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry) return { allowed: true };

  // Sprawdź czy jest aktywna blokada
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // Jeśli minęło okno czasowe, zresetuj wpis
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitMap.delete(key);
    return { allowed: true };
  }

  // Jeśli osiągnięto limit prób, nałóż blokadę
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    return { allowed: false, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }

  return { allowed: true };
}

/**
 * Rejestruje nieudaną próbę logowania.
 */
export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    rateLimitMap.set(key, { attempts: 1, firstAttempt: now });
  } else {
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_MS;
    }
  }

  // Sprzątanie mapy przy dużym obciążeniu
  if (rateLimitMap.size > 5000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now - v.firstAttempt > WINDOW_MS && (!v.lockedUntil || now > v.lockedUntil)) {
        rateLimitMap.delete(k);
      }
    }
  }
}

/**
 * Czyści licznik prób po udanym logowaniu.
 */
export function clearRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

// ---------------------------------------------------------------------------
// Sanityzacja danych wejściowych
// ---------------------------------------------------------------------------

/**
 * Czyści numer produktu z niedozwolonych znaków kontrolnych i formatuje.
 */
export function sanitizeProductNumber(val: string): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/[^\w\s\-./]/g, "")
    .trim()
    .slice(0, 50);
}

/**
 * Sanityzuje zapytanie wyszukiwania dla zapytań SQL LIKE (usuwa znaki specjalne % _ \ () ,).
 */
export function sanitizeSearchQuery(query?: string): string {
  if (!query || typeof query !== "string") return "";
  return query
    .replace(/[%_\\,()]/g, "")
    .trim()
    .slice(0, 50);
}
