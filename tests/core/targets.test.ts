import { describe, expect, it } from "vitest";
import {
  canonicalTarget,
  centerSquare,
  discFade,
  halveTarget,
  levels,
  luminance,
} from "../../src/core/targets";

describe("centerSquare", () => {
  it("crops the middle of a landscape or portrait image", () => {
    expect(centerSquare(400, 300)).toEqual({ sx: 50, sy: 0, size: 300 });
    expect(centerSquare(300, 500)).toEqual({ sx: 0, sy: 100, size: 300 });
  });
});

describe("luminance", () => {
  it("weights RGB with Rec. 601 luma", () => {
    const rgba = [255, 255, 255, 255, 0, 0, 0, 255, 0, 255, 0, 255];
    const t = luminance(rgba, 3);
    expect(t[0]).toBeCloseTo(1, 6);
    expect(t[1]).toBe(0);
    expect(t[2]).toBeCloseTo(0.587, 6);
  });
});

describe("levels", () => {
  it("maps the 2nd and 98th percentiles to 0 and 1 and clamps the tails", () => {
    const t = Float32Array.from({ length: 100 }, (_, i) => 0.2 + (0.5 * i) / 99);
    const out = levels(t);
    expect(out[2]).toBeCloseTo(0, 6);
    expect(out[98]).toBeCloseTo(1, 6);
    expect(out[0]).toBe(0);
    expect(out[99]).toBe(1);
  });
});

describe("discFade", () => {
  it("keeps the centre and blanks the corners", () => {
    const n = 32;
    const out = discFade(new Float32Array(n * n).fill(1), n);
    expect(out[(n / 2) * n + n / 2]).toBe(1);
    expect(out[0]).toBe(0);
    expect(out[n * n - 1]).toBe(0);
  });
});

describe("canonicalTarget", () => {
  it("rounds to 16-bit levels, clamps, and is idempotent", () => {
    const t = Float32Array.of(-0.2, 0.123456789, 1.4);
    const c = canonicalTarget(t);
    expect(c[0]).toBe(0);
    expect(c[2]).toBe(1);
    expect(Math.round(c[1]! * 65535)).toBeCloseTo(c[1]! * 65535, 3);
    expect(canonicalTarget(c)).toEqual(c);
  });
});

describe("halveTarget", () => {
  it("averages 2 × 2 blocks", () => {
    const t = Float32Array.of(0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0);
    expect(Array.from(halveTarget(t, 4))).toEqual([0.5, 0.25, 1, 0]);
  });
});
