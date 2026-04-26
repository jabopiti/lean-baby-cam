import { describe, it, expect } from "vitest";
import {
  generateSecurePin,
  generateSharedSecret,
  normalizeSecret,
  timingSafeEqual,
  encodePairingPayload,
  parsePairingPayload,
} from "../pairing";

describe("pairing", () => {
  describe("generateSecurePin", () => {
    it("returns a 6-digit numeric string", () => {
      for (let i = 0; i < 100; i++) {
        const pin = generateSecurePin();
        expect(pin).toMatch(/^\d{6}$/);
        const n = Number(pin);
        expect(n).toBeGreaterThanOrEqual(100_000);
        expect(n).toBeLessThanOrEqual(999_999);
      }
    });

    it("produces sufficiently varied output", () => {
      const samples = new Set<string>();
      for (let i = 0; i < 500; i++) samples.add(generateSecurePin());
      // 500 draws from 900k space → realistically all unique, allow tiny collision margin.
      expect(samples.size).toBeGreaterThan(495);
    });
  });

  describe("generateSharedSecret", () => {
    it("returns 4 chars from the unambiguous alphabet", () => {
      for (let i = 0; i < 100; i++) {
        const s = generateSharedSecret();
        expect(s).toMatch(/^[A-Z2-9]{4}$/);
        expect(s).not.toMatch(/[01OIL]/);
      }
    });
  });

  describe("normalizeSecret", () => {
    it("uppercases, strips, and clamps", () => {
      expect(normalizeSecret("ab-cd")).toBe("ABCD");
      expect(normalizeSecret("ab cd ef")).toBe("ABCD");
      expect(normalizeSecret("xY9!")).toBe("XY9");
    });
  });

  describe("timingSafeEqual", () => {
    it("returns false for different lengths", () => {
      expect(timingSafeEqual("abc", "abcd")).toBe(false);
    });
    it("returns false for same-length different content", () => {
      expect(timingSafeEqual("abcd", "abce")).toBe(false);
    });
    it("returns true for equal strings", () => {
      expect(timingSafeEqual("ABCD", "ABCD")).toBe(true);
    });
    it("handles empty strings", () => {
      expect(timingSafeEqual("", "")).toBe(true);
    });
  });

  describe("encode/parse round-trip", () => {
    it("round-trips PIN + secret", () => {
      const payload = encodePairingPayload("123456", "AB3X");
      const parsed = parsePairingPayload(payload);
      expect(parsed.pin).toBe("123456");
      expect(parsed.secret).toBe("AB3X");
    });
    it("handles PIN-only legacy payloads", () => {
      const parsed = parsePairingPayload("654321");
      expect(parsed.pin).toBe("654321");
      expect(parsed.secret).toBeNull();
    });
    it("trims whitespace and strips non-digits from PIN segment", () => {
      const parsed = parsePairingPayload("  12-34-56.WXYZ  ");
      expect(parsed.pin).toBe("123456");
      expect(parsed.secret).toBe("WXYZ");
    });
  });
});