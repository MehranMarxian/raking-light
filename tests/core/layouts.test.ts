import { describe, expect, it } from "vitest";
import { SAMPLE_LAYOUTS, SAMPLE_PICTURES, angularDistance } from "../../src/core/layouts";

describe("angularDistance", () => {
  it("takes the short way round", () => {
    expect(angularDistance(350, 10)).toBe(20);
    expect(angularDistance(10, 350)).toBe(20);
    expect(angularDistance(0, 180)).toBe(180);
    expect(angularDistance(270, -90)).toBe(0);
  });
});

describe("sample layouts", () => {
  it("sets the two lamps 90° apart, where pictures separate cleanly", () => {
    const [a, b] = SAMPLE_LAYOUTS.two;
    expect(angularDistance(a.az, b.az)).toBe(90);
  });

  it("spreads three lamps 120° apart", () => {
    const [a, b, c] = SAMPLE_LAYOUTS.three;
    expect([angularDistance(a.az, b.az), angularDistance(b.az, c.az)]).toEqual([120, 120]);
  });

  it("only refers to pictures that exist", () => {
    for (const lamp of [...SAMPLE_LAYOUTS.two, ...SAMPLE_LAYOUTS.three]) {
      expect(SAMPLE_PICTURES[lamp.picture]).toBeDefined();
    }
  });
});
