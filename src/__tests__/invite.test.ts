import { describe, it, expect } from "vitest";
import {
  generateInviteCode,
  getInviteExpiration,
  isInviteValid,
} from "@/lib/invite";

describe("invite utilities", () => {
  describe("generateInviteCode", () => {
    it("generates a 6-character code", () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(6);
    });

    it("only contains allowed characters (no 0, O, 1, I)", () => {
      const allowed = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (let i = 0; i < 50; i++) {
        const code = generateInviteCode();
        for (const char of code) {
          expect(allowed).toContain(char);
        }
      }
    });

    it("generates unique codes (probabilistic)", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      // With 6 chars from 28 options, collisions in 100 are astronomically unlikely
      expect(codes.size).toBeGreaterThan(95);
    });
  });

  describe("getInviteExpiration", () => {
    it("returns a date roughly 48 hours in the future", () => {
      const before = Date.now();
      const expiration = getInviteExpiration();
      const after = Date.now();

      const expected48h = 48 * 60 * 60 * 1000;
      expect(expiration.getTime()).toBeGreaterThanOrEqual(before + expected48h);
      expect(expiration.getTime()).toBeLessThanOrEqual(after + expected48h);
    });
  });

  describe("isInviteValid", () => {
    it("returns true for a future date", () => {
      const future = new Date(Date.now() + 60000);
      expect(isInviteValid(future)).toBe(true);
    });

    it("returns false for a past date", () => {
      const past = new Date(Date.now() - 60000);
      expect(isInviteValid(past)).toBe(false);
    });
  });
});
