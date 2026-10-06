import { describe, expect, it } from "vitest";
import {
  OVERHEAD,
  cellBrightness,
  lampVector,
  shadeField,
  type Vec3,
} from "../../src/core/shading";

const deg = (d: number) => (d * Math.PI) / 180;

/** A field rising to the right: h = slope · x. */
function rampX(F: number, slope: number): Float64Array {
  return Float64Array.from({ length: F * F }, (_, i) => slope * (i % F));
}

describe("lampVector", () => {
  it("points along image axes: 0° right, 270° top, elevation up", () => {
    const close = (v: Vec3, w: Vec3) => {
      v.forEach((c, i) => {
        expect(c).toBeCloseTo(w[i]!, 12);
      });
    };
    close(lampVector(0, 0), [1, 0, 0]);
    close(lampVector(270, 0), [0, -1, 0]);
    close(lampVector(123, 90), OVERHEAD);
  });

  it("is a unit vector", () => {
    const [x, y, z] = lampVector(37, 18);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12);
  });
});

describe("shading", () => {
  it("shades a flat surface at sin(elevation), the darkest raking background (key finding 2)", () => {
    const h = new Float64Array(16 * 16);
    for (const v of cellBrightness(h, 4, 4, lampVector(270, 18), "clamped")) {
      expect(v).toBeCloseTo(Math.sin(deg(18)), 12);
    }
  });

  it("darkens a slope that turns away from the lamp", () => {
    const h = rampX(8, 0.5);
    const fromRight = shadeField(h, 8, lampVector(0, 18), "clamped");
    const fromLeft = shadeField(h, 8, lampVector(180, 18), "clamped");
    expect(fromRight[0]).toBeLessThan(fromLeft[0]!);
  });

  it("reads the last column as flat when clamped, and wraps when periodic", () => {
    const F = 8;
    const h = rampX(F, 0.5);
    const L = lampVector(0, 18);
    const lastColumn = F - 1;
    expect(shadeField(h, F, L, "clamped")[lastColumn]).toBeCloseTo(Math.sin(deg(18)), 6);
    // Periodic: the edge facet sees the drop from 3.5 back to 0, a steep face toward the lamp.
    expect(shadeField(h, F, L, "periodic")[lastColumn]).toBeGreaterThan(0.9);
  });
});
