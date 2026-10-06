import { describe, expect, it } from "vitest";
import { centerSquare, discFade, levels, luminance } from "../../src/core/targets";

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
