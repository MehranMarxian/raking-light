import { describe, expect, it } from "vitest";
import { ghostReport, reportForField } from "../../src/core/report";
import { createSolver } from "../../src/core/solver";
import { discTarget, leftHalfTarget, randomTargets } from "./helpers";

describe("ghostReport", () => {
  it("measures how much of another picture leaks in, relative to the lamp's own", () => {
    const [a, b] = randomTargets(2, 24, 11) as [Float32Array, Float32Array];
    const renderA = Float64Array.from(a, (v, i) => 0.1 + 0.7 * v + 0.14 * b[i]!);
    const renderB = Float64Array.from(b, (v, i) => 0.2 + 0.5 * v - 0.05 * a[i]!);
    const [ra, rb] = ghostReport([renderA, renderB], [a, b]);
    expect(ra!.ghosts[0]).toBeCloseTo(1, 9);
    expect(ra!.ghosts[1]).toBeCloseTo(0.2, 9);
    expect(rb!.ghosts[0]).toBeCloseTo(-0.1, 9);
    expect(ra!.clarity).toBeGreaterThan(0.9);
  });

  it("reports clean separation for two lamps 90° apart after a solve", () => {
    const n = 24;
    const lamps = [
      { az: 270, el: 18, target: discTarget(n) },
      { az: 0, el: 18, target: leftHalfTarget(n) },
    ];
    const solver = createSolver({ n, C: 4, lamps });
    for (let i = 0; i < 200; i++) solver.step();
    const [a, b] = reportForField(solver.heights, n, 4, lamps, "clamped");
    expect(a!.clarity).toBeGreaterThan(0.8);
    expect(Math.abs(a!.ghosts[1]!)).toBeLessThan(0.2);
    expect(Math.abs(b!.ghosts[0]!)).toBeLessThan(0.2);
  });
});
