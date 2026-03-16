import { describe, it, expect } from "vitest";
import { pickHouseholdColor, pickHouseholdColorSet } from "@/lib/colors";
import type { HouseholdColorSet } from "@/lib/colors";

describe("pickHouseholdColor", () => {
  it("returns the first dot color for index 0", () => {
    expect(pickHouseholdColor(0)).toBe("#5eb1ef");
  });

  it("returns the second dot color for index 1", () => {
    expect(pickHouseholdColor(1)).toBe("#ffba18");
  });

  it("wraps around when index exceeds the palette size", () => {
    expect(pickHouseholdColor(8)).toBe("#5eb1ef"); // wraps back to first
  });

  it("always returns a valid hex color", () => {
    for (let i = 0; i < 20; i++) {
      const color = pickHouseholdColor(i);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("pickHouseholdColorSet", () => {
  it("returns the full color set for index 0", () => {
    const set: HouseholdColorSet = pickHouseholdColorSet(0);
    expect(set.dot).toBe("#5eb1ef");
    expect(set.tagBg).toBe("#e6f4fe");
    expect(set.tagBorder).toBe("#8ec8f6");
    expect(set.tagText).toBe("#0d74ce");
  });

  it("wraps around when index exceeds the palette size", () => {
    const set = pickHouseholdColorSet(8);
    expect(set.dot).toBe("#5eb1ef"); // wraps back to first
  });

  it("returns an object with all required properties", () => {
    for (let i = 0; i < 8; i++) {
      const set = pickHouseholdColorSet(i);
      expect(set).toHaveProperty("dot");
      expect(set).toHaveProperty("tagBg");
      expect(set).toHaveProperty("tagBorder");
      expect(set).toHaveProperty("tagText");
    }
  });

  it("dot color matches pickHouseholdColor for all indices", () => {
    for (let i = 0; i < 20; i++) {
      expect(pickHouseholdColorSet(i).dot).toBe(pickHouseholdColor(i));
    }
  });
});
