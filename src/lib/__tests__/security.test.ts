import { describe, it, expect, beforeEach } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  constantTimeCompare,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  sanitizeProductNumber,
  sanitizeSearchQuery,
} from "../security";

describe("Moduł bezpieczeństwa (security.ts)", () => {
  describe("Tokeny sesyjne (createSessionToken & verifySessionToken)", () => {
    it("tworzy i poprawnie weryfikuje podpisany token sesji", () => {
      const token = createSessionToken({
        inspectorId: "e1-uuid",
        inspectorName: "Jan Kowalski",
      });

      expect(typeof token).toBe("string");
      expect(token).toContain(".");

      const session = verifySessionToken(token);
      expect(session).not.toBeNull();
      expect(session?.inspectorId).toBe("e1-uuid");
      expect(session?.inspectorName).toBe("Jan Kowalski");
      expect(session?.expiresAt).toBeGreaterThan(Date.now());
    });

    it("odrzuca token ze zmienioną sygnaturą (próba manipulacji)", () => {
      const token = createSessionToken({
        inspectorId: "e1-uuid",
        inspectorName: "Jan Kowalski",
      });

      const parts = token.split(".");
      const tamperedToken = `${parts[0]}.invalidSignature123`;
      expect(verifySessionToken(tamperedToken)).toBeNull();
    });

    it("odrzuca token ze zmienioną treścią payloadu", () => {
      const token = createSessionToken({
        inspectorId: "e1-uuid",
        inspectorName: "Jan Kowalski",
      });

      const parts = token.split(".");
      // Zmieniamy payload podmieniając base64
      const fakeData = Buffer.from(
        JSON.stringify({
          inspectorId: "hacked",
          inspectorName: "Attacker",
          createdAt: Date.now(),
          expiresAt: Date.now() + 100000,
        }),
      ).toString("base64url");

      const forgedToken = `${fakeData}.${parts[1]}`;
      expect(verifySessionToken(forgedToken)).toBeNull();
    });

    it("odrzuca token, który wygasł", () => {
      // Token z czasem trwania -1000 ms (już wygasły)
      const expiredToken = createSessionToken(
        { inspectorId: "e1", inspectorName: "Anna Nowak" },
        -1000,
      );

      expect(verifySessionToken(expiredToken)).toBeNull();
    });

    it("odrzuca nieprawidłowe ciągi i puste tokeny", () => {
      expect(verifySessionToken("")).toBeNull();
      expect(verifySessionToken("invalid-format")).toBeNull();
      expect(verifySessionToken("a.b.c")).toBeNull();
    });
  });

  describe("Porównywanie stałoczasowe (constantTimeCompare)", () => {
    it("zwraca true dla identycznych wartości", () => {
      expect(constantTimeCompare("1234", "1234")).toBe(true);
      expect(constantTimeCompare("secret-token", "secret-token")).toBe(true);
    });

    it("zwraca false dla różnych wartości", () => {
      expect(constantTimeCompare("1234", "1235")).toBe(false);
      expect(constantTimeCompare("1234", "123")).toBe(false);
      expect(constantTimeCompare("1234", "")).toBe(false);
    });
  });

  describe("Rate limiting (ochrona przed atakami brute-force)", () => {
    const testIp = "test-client-ip-123";

    beforeEach(() => {
      clearRateLimit(testIp);
    });

    it("początkowo pozwala na próby logowania", () => {
      expect(checkRateLimit(testIp).allowed).toBe(true);
    });

    it("blokuje po 5 nieudanych próbach", () => {
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt(testIp);
        expect(checkRateLimit(testIp).allowed).toBe(true);
      }

      // 5. próba
      recordFailedAttempt(testIp);
      const status = checkRateLimit(testIp);
      expect(status.allowed).toBe(false);
      expect(status.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("czyści licznik po wywołaniu clearRateLimit", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testIp);
      }
      expect(checkRateLimit(testIp).allowed).toBe(false);

      clearRateLimit(testIp);
      expect(checkRateLimit(testIp).allowed).toBe(true);
    });
  });

  describe("Sanityzacja danych wejściowych", () => {
    it("sanitizeProductNumber usuwa niebezpieczne znaki", () => {
      expect(sanitizeProductNumber("SKO-00101")).toBe("SKO-00101");
      expect(sanitizeProductNumber("SKO<script>00101")).toBe("SKOscript00101");
      expect(sanitizeProductNumber("  00101  ")).toBe("00101");
    });

    it("sanitizeSearchQuery usuwa znaki specjalne LIKE", () => {
      expect(sanitizeSearchQuery("00101")).toBe("00101");
      expect(sanitizeSearchQuery("%admin_pass%")).toBe("adminpass");
      expect(sanitizeSearchQuery("SKO\\(123)")).toBe("SKO123");
    });
  });
});
