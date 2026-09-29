import { describe, it, expect } from "vitest";
import { rangeResult, finalResult, shiftFor, F1_MAX, F2_MAX } from "../qc";

describe("Kontrola jakości - reguły biznesowe (qc.ts)", () => {
  describe("rangeResult dla F1 (dopuszczalne: 0.0 - 2.0 mm)", () => {
    it("zwraca OK dla wartości w zakresie 0.0 do 2.0", () => {
      expect(rangeResult(0.0, F1_MAX)).toBe("OK");
      expect(rangeResult(1.0, F1_MAX)).toBe("OK");
      expect(rangeResult(1.5, F1_MAX)).toBe("OK");
      expect(rangeResult(2.0, F1_MAX)).toBe("OK");
    });

    it("zwraca NOK dla wartości powyżej 2.0", () => {
      expect(rangeResult(2.1, F1_MAX)).toBe("NOK");
      expect(rangeResult(3.0, F1_MAX)).toBe("NOK");
      expect(rangeResult(100.0, F1_MAX)).toBe("NOK");
    });

    it("zwraca NOK dla wartości ujemnych", () => {
      expect(rangeResult(-0.1, F1_MAX)).toBe("NOK");
      expect(rangeResult(-1.0, F1_MAX)).toBe("NOK");
    });
  });

  describe("rangeResult dla F2 (dopuszczalne: 0.0 - 5.0 mm)", () => {
    it("zwraca OK dla wartości w zakresie 0.0 do 5.0", () => {
      expect(rangeResult(0.0, F2_MAX)).toBe("OK");
      expect(rangeResult(2.5, F2_MAX)).toBe("OK");
      expect(rangeResult(5.0, F2_MAX)).toBe("OK");
    });

    it("zwraca NOK dla wartości powyżej 5.0", () => {
      expect(rangeResult(5.1, F2_MAX)).toBe("NOK");
      expect(rangeResult(6.0, F2_MAX)).toBe("NOK");
    });

    it("zwraca NOK dla wartości ujemnych", () => {
      expect(rangeResult(-0.1, F2_MAX)).toBe("NOK");
    });
  });

  describe("finalResult (wynik końcowy pojedynczej sztuki)", () => {
    it("zwraca OK tylko wtedy gdy F1=OK, F2=OK, F3=OK i Zgodne=TAK", () => {
      expect(finalResult("OK", "OK", "OK", "TAK")).toBe("OK");
    });

    it("zwraca NOK jeśli F1=NOK", () => {
      expect(finalResult("NOK", "OK", "OK", "TAK")).toBe("NOK");
    });

    it("zwraca NOK jeśli F2=NOK", () => {
      expect(finalResult("OK", "NOK", "OK", "TAK")).toBe("NOK");
    });

    it("zwraca NOK jeśli F3=NOK", () => {
      expect(finalResult("OK", "OK", "NOK", "TAK")).toBe("NOK");
    });

    it("zwraca NOK jeśli Zgodne=NIE", () => {
      expect(finalResult("OK", "OK", "OK", "NIE")).toBe("NOK");
    });

    it("zwraca NOK gdy wszystkie są niepoprawne", () => {
      expect(finalResult("NOK", "NOK", "NOK", "NIE")).toBe("NOK");
    });
  });

  describe("shiftFor (obliczanie zmiany wg strefy czasowej Europe/Warsaw)", () => {
    it("zwraca 'I zmiana' dla godzin 06:00 - 13:59", () => {
      // 06:00 Warszawa (UTC+1 w zimie / UTC+2 w lecie)
      const d1 = new Date("2026-05-15T04:30:00Z"); // 06:30 Warszawa
      expect(shiftFor(d1)).toBe("I zmiana");

      const d2 = new Date("2026-05-15T11:45:00Z"); // 13:45 Warszawa
      expect(shiftFor(d2)).toBe("I zmiana");
    });

    it("zwraca 'II zmiana' dla godzin 14:00 - 21:59", () => {
      const d1 = new Date("2026-05-15T12:15:00Z"); // 14:15 Warszawa
      expect(shiftFor(d1)).toBe("II zmiana");

      const d2 = new Date("2026-05-15T19:30:00Z"); // 21:30 Warszawa
      expect(shiftFor(d2)).toBe("II zmiana");
    });

    it("zwraca 'Poza zmianą' dla godzin nocnych", () => {
      const d1 = new Date("2026-05-15T20:30:00Z"); // 22:30 Warszawa
      expect(shiftFor(d1)).toBe("Poza zmianą");

      const d2 = new Date("2026-05-15T02:00:00Z"); // 04:00 Warszawa
      expect(shiftFor(d2)).toBe("Poza zmianą");
    });
  });
});
