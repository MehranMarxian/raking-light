import { describe, expect, it } from "vitest";
import {
  SAMPLE_LAYOUTS,
  SAMPLE_PICTURES,
  angularDistance,
  freeAzimuth,
  layoutWarnings,
} from "../../src/core/layouts";

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

describe("layoutWarnings", () => {
  it("is quiet for the two-lamp sample", () => {
    expect(layoutWarnings(SAMPLE_LAYOUTS.two)).toEqual([]);
  });

  it("warns about opposite lamps, crowded lamps, ghosts and high lamps", () => {
    expect(
      layoutWarnings([
        { az: 0, el: 18 },
        { az: 170, el: 18 },
      ]),
    ).toEqual([{ kind: "opposite", lamps: [0, 1] }]);
    expect(
      layoutWarnings([
        { az: 350, el: 18 },
        { az: 20, el: 18 },
      ]),
    ).toEqual([{ kind: "crowded", lamps: [0, 1], apart: 30 }]);
    expect(layoutWarnings(SAMPLE_LAYOUTS.three)).toEqual([{ kind: "ghosts", count: 3 }]);
    expect(
      layoutWarnings([
        { az: 270, el: 45 },
        { az: 0, el: 18 },
      ]),
    ).toEqual([{ kind: "high", lamp: 0 }]);
  });
});

describe("freeAzimuth", () => {
  it("places a new lamp in the middle of the widest gap", () => {
    expect(freeAzimuth([270, 0])).toBe(135);
    expect(freeAzimuth([0, 90, 180])).toBe(270);
    expect(freeAzimuth([])).toBe(270);
  });
});
