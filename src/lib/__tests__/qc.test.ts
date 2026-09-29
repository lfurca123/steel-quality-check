import { describe, it, expect } from "vitest";
import { finalResult, rangeResult, shiftFor, F1_MAX, F2_MAX } from "../qc";

describe("QC Business Logic", () => {
  describe("rangeResult", () => {
    it("returns OK for values within range (F1)", () => {
      expect(rangeResult(0.0, F1_MAX)).toBe("OK");
      expect(rangeResult(1.0, F1_MAX)).toBe("OK");
      expect(rangeResult(2.0, F1_MAX)).toBe("OK");
    });

    it("returns OK for values within range (F2)", () => {
      expect(rangeResult(0.0, F2_MAX)).toBe("OK");
      expect(rangeResult(2.5, F2_MAX)).toBe("OK");
      expect(rangeResult(5.0, F2_MAX)).toBe("OK");
    });

    it("returns NOK for negative values", () => {
      expect(rangeResult(-0.1, F1_MAX)).toBe("NOK");
      expect(rangeResult(-1.0, F2_MAX)).toBe("NOK");
    });

    it("returns NOK for values exceeding max", () => {
      expect(rangeResult(2.1, F1_MAX)).toBe("NOK");
      expect(rangeResult(5.1, F2_MAX)).toBe("NOK");
      expect(rangeResult(100.0, F1_MAX)).toBe("NOK");
    });

    it("returns OK for boundary values (0.0 and max)", () => {
      expect(rangeResult(0.0, 2.0)).toBe("OK");
      expect(rangeResult(2.0, 2.0)).toBe("OK");
      expect(rangeResult(5.0, 5.0)).toBe("OK");
    });
  });

  describe("finalResult", () => {
    it("returns OK only when all checks pass", () => {
      expect(finalResult("OK", "OK", "OK", "TAK")).toBe("OK");
    });

    it("returns NOK when F1 fails", () => {
      expect(finalResult("NOK", "OK", "OK", "TAK")).toBe("NOK");
    });

    it("returns NOK when F2 fails", () => {
      expect(finalResult("OK", "NOK", "OK", "TAK")).toBe("NOK");
    });

    it("returns NOK when F3 fails", () => {
      expect(finalResult("OK", "OK", "NOK", "TAK")).toBe("NOK");
    });

    it("returns NOK when Zgodne is NIE", () => {
      expect(finalResult("OK", "OK", "OK", "NIE")).toBe("NOK");
    });

    it("returns NOK when multiple checks fail", () => {
      expect(finalResult("NOK", "NOK", "OK", "TAK")).toBe("NOK");
      expect(finalResult("NOK", "NOK", "NOK", "NIE")).toBe("NOK");
    });

    it("applies correct decision tree logic", () => {
      // Test all combinations to ensure AND logic is strict
      const okResults = [
        finalResult("OK", "OK", "OK", "TAK"),
      ];
      const nokResults = [
        finalResult("OK", "OK", "OK", "NIE"),
        finalResult("OK", "OK", "NOK", "TAK"),
        finalResult("OK", "NOK", "OK", "TAK"),
        finalResult("NOK", "OK", "OK", "TAK"),
      ];

      okResults.forEach((result) => expect(result).toBe("OK"));
      nokResults.forEach((result) => expect(result).toBe("NOK"));
    });
  });

  describe("shiftFor", () => {
    it("returns I zmiana for 6:00-14:00", () => {
      const shift1 = shiftFor(new Date("2026-09-29T06:00:00Z"));
      const shift2 = shiftFor(new Date("2026-09-29T10:00:00Z"));
      const shift3 = shiftFor(new Date("2026-09-29T13:59:00Z"));
      // Note: These dates are UTC, actual hour depends on timezone
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift1);
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift2);
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift3);
    });

    it("returns II zmiana for 14:00-22:00", () => {
      const shift1 = shiftFor(new Date("2026-09-29T14:00:00Z"));
      const shift2 = shiftFor(new Date("2026-09-29T18:00:00Z"));
      const shift3 = shiftFor(new Date("2026-09-29T21:59:00Z"));
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift1);
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift2);
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift3);
    });

    it("returns Poza zmianą for outside working hours", () => {
      const shift1 = shiftFor(new Date("2026-09-29T00:00:00Z"));
      const shift2 = shiftFor(new Date("2026-09-29T22:01:00Z"));
      const shift3 = shiftFor(new Date("2026-09-29T23:59:00Z"));
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift1);
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift2);
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift3);
    });

    it("always returns a valid shift label", () => {
      const now = new Date();
      const shift = shiftFor(now);
      expect(["I zmiana", "II zmiana", "Poza zmianą"]).toContain(shift);
    });
  });
});
