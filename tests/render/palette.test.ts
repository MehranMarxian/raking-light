import { describe, expect, it } from "vitest";
import { falloff, lampTint, lowness } from "../../src/render/stage/palette";

const close = (actual: readonly number[], expected: readonly number[]) => {
  actual.forEach((v, i) => {
    expect(v).toBeCloseTo(expected[i]!, 9);
  });
};

describe("palette", () => {
  it("is neutral overhead and full tungsten at 10° and below", () => {
    expect(lampTint(90)).toEqual([236, 229, 216]);
    expect(lampTint(10)).toEqual([255, 226, 176]);
  });

  it("is mostly warm at the solve elevation of 18°", () => {
    close(lampTint(18), [251.96, 226.48, 182.4]);
  });

  it("ramps lowness from 60° down to 10°", () => {
    expect(lowness(60)).toBe(0);
    expect(lowness(35)).toBe(0.5);
    expect(lowness(18)).toBeCloseTo(0.84, 12);
    expect(lowness(4)).toBe(1);
  });

  it("only darkens the far side of the disc under a low lamp", () => {
    expect(falloff(90)).toBe(0);
    expect(falloff(18)).toBeCloseTo(0.1176, 12);
    expect(falloff(10)).toBeCloseTo(0.14, 12);
  });
});
