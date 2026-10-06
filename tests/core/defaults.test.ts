import { describe, expect, it } from "vitest";
import { DEFAULTS, gridSize } from "../../src/core/defaults";

describe("solver defaults", () => {
  it("backs each of the 96 × 96 cells with a 4 × 4 patch, giving a 384² grid", () => {
    expect(gridSize(DEFAULTS.n, DEFAULTS.C)).toBe(384);
  });

  it("maps targets into a brightness range inside (0, 1)", () => {
    expect(DEFAULTS.lo).toBeGreaterThan(0);
    expect(DEFAULTS.hi).toBeLessThan(1);
    expect(DEFAULTS.lo).toBeLessThan(DEFAULTS.hi);
  });
});
