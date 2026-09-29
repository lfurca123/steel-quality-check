import { describe, it, expect, beforeEach, vi } from "vitest";
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

describe("Security Module", () => {
  describe("Session Token", () => {
    it("creates a valid token with correct format", () => {
      const token = createSessionToken({
        inspectorId: "123",
        inspectorName: "Test User",
      });
      expect(token).toBeTruthy();
      expect(token.split(".")).toHaveLength(2);
    });

    it("verifies a valid token and returns payload", () => {
      const payload = {
        inspectorId: "123",
        inspectorName: "Test User",
      };
      const token = createSessionToken(payload);
      const verified = verifySessionToken(token);
      expect(verified).toBeTruthy();
      expect(verified?.inspectorId).toBe("123");
      expect(verified?.inspectorName).toBe("Test User");
    });

    it("rejects tampered tokens", () => {
      const token = createSessionToken({
        inspectorId: "123",
        inspectorName: "Test User",
      });
      const [data, signature] = token.split(".");
      const tamperedToken = data + ".invalidsignature";
      const verified = verifySessionToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it("rejects expired tokens", () => {
      const token = createSessionToken(
        {
          inspectorId: "123",
          inspectorName: "Test User",
        },
        -1000, // Negative duration = already expired
      );
      const verified = verifySessionToken(token);
      expect(verified).toBeNull();
    });

    it("rejects malformed tokens", () => {
      expect(verifySessionToken("invalid")).toBeNull();
      expect(verifySessionToken("")).toBeNull();
      expect(verifySessionToken("a.b.c")).toBeNull();
    });
  });

  describe("constantTimeCompare", () => {
    it("returns true for matching strings", () => {
      expect(constantTimeCompare("password123", "password123")).toBe(true);
      expect(constantTimeCompare("", "")).toBe(true);
    });

    it("returns false for different strings", () => {
      expect(constantTimeCompare("password123", "password124")).toBe(false);
      expect(constantTimeCompare("abc", "def")).toBe(false);
    });

    it("returns false for different lengths", () => {
      expect(constantTimeCompare("short", "muchmuchtlonger")).toBe(false);
    });

    it("returns false for non-string inputs", () => {
      expect(constantTimeCompare("123" as any, 123 as any)).toBe(false);
      expect(constantTimeCompare(null as any, "123")).toBe(false);
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      clearRateLimit("test-client");
    });

    it("allows initial requests", () => {
      const result = checkRateLimit("test-client");
      expect(result.allowed).toBe(true);
    });

    it("blocks after 5 failed attempts", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("test-client");
      }
      const result = checkRateLimit("test-client");
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeDefined();
    });

    it("provides retry-after time when blocked", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("test-client");
      }
      const result = checkRateLimit("test-client");
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(300);
    });

    it("clears rate limit after successful login", () => {
      for (let i = 0; i < 3; i++) {
        recordFailedAttempt("test-client");
      }
      clearRateLimit("test-client");
      const result = checkRateLimit("test-client");
      expect(result.allowed).toBe(true);
    });
  });

  describe("Input Sanitization", () => {
    describe("sanitizeProductNumber", () => {
      it("preserves valid alphanumeric and special allowed characters", () => {
        expect(sanitizeProductNumber("SKO-00101")).toBe("SKO-00101");
        expect(sanitizeProductNumber("PART_123")).toBe("PART_123");
        expect(sanitizeProductNumber("SKO.2024.A")).toBe("SKO.2024.A");
      });

      it("removes control characters and invalid symbols", () => {
        expect(sanitizeProductNumber("SKO<script>alert()</script>")).not.toContain("<script>");
        expect(sanitizeProductNumber("TEST;DROP")).not.toContain(";");
      });

      it("trims whitespace", () => {
        expect(sanitizeProductNumber("  SKO-00101  ")).toBe("SKO-00101");
      });

      it("limits length to 50 characters", () => {
        const longString = "A".repeat(100);
        const result = sanitizeProductNumber(longString);
        expect(result.length).toBeLessThanOrEqual(50);
      });

      it("handles empty input gracefully", () => {
        expect(sanitizeProductNumber("")).toBe("");
      });

      it("returns empty string for non-string input", () => {
        expect(sanitizeProductNumber(null as any)).toBe("");
        expect(sanitizeProductNumber(undefined as any)).toBe("");
      });
    });

    describe("sanitizeSearchQuery", () => {
      it("removes SQL wildcard characters", () => {
        const query = "SKO%00101";
        expect(sanitizeSearchQuery(query)).not.toContain("%");
      });

      it("removes SQL injection characters", () => {
        expect(sanitizeSearchQuery("'; DROP TABLE users; --")).not.toContain("'");
        expect(sanitizeSearchQuery("OR 1=1")).toBe("OR 11");
      });

      it("removes LIKE escape character", () => {
        expect(sanitizeSearchQuery("test\\value")).not.toContain("\\");
      });

      it("trims whitespace", () => {
        expect(sanitizeSearchQuery("  SKO-00101  ")).toBe("SKO-00101");
      });

      it("limits length to 50 characters", () => {
        const longString = "A".repeat(100);
        const result = sanitizeSearchQuery(longString);
        expect(result.length).toBeLessThanOrEqual(50);
      });

      it("handles empty and undefined input", () => {
        expect(sanitizeSearchQuery("")).toBe("");
        expect(sanitizeSearchQuery(undefined)).toBe("");
      });
    });
  });
});
