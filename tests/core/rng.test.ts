import { describe, expect, it } from "vitest";
import { gaussian, mulberry32 } from "../../src/core/rng";

const take = (rng: () => number, count: number) => Array.from({ length: count }, rng);

describe("mulberry32", () => {
  it("repeats its sequence for the same seed", () => {
    expect(take(mulberry32(7), 100)).toEqual(take(mulberry32(7), 100));
  });

  it("gives different sequences for different seeds", () => {
    expect(take(mulberry32(7), 10)).not.toEqual(take(mulberry32(8), 10));
  });

  it("stays in [0, 1)", () => {
    for (const v of take(mulberry32(123), 10_000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("gaussian", () => {
  it("has the requested mean and standard deviation", () => {
    const rng = mulberry32(7);
    const xs = Array.from({ length: 50_000 }, () => gaussian(rng, 0.6));
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const std = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    expect(Math.abs(mean)).toBeLessThan(0.01);
    expect(std).toBeCloseTo(0.6, 2);
  });
});
