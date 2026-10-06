import { beforeAll, describe, expect, it } from "vitest";
import { OVERHEAD, cellBrightness, lampVector } from "../../src/core/shading";
import {
  buildTerms,
  createSolver,
  createWorkspace,
  evaluate,
  type Problem,
} from "../../src/core/solver";
import { bits, correlation, discTarget, leftHalfTarget, standardDeviation } from "./helpers";

// docs/SOLVER.md §8, tests 2–5, on binary targets that are uncorrelated with each other:
// a centred disc for lamp A (270°) and the left half for lamp B (0°), both at 18°.

const C = 4;
const LAMP_A = { az: 270, el: 18 };
const LAMP_B = { az: 0, el: 18 };

function twoLampProblem(n: number, params: Problem["params"] = {}): Problem {
  return {
    n,
    C,
    lamps: [
      { ...LAMP_A, target: discTarget(n) },
      { ...LAMP_B, target: leftHalfTarget(n) },
    ],
    params,
  };
}

function solve(problem: Problem, iterations = 300): Float32Array {
  const solver = createSolver(problem);
  for (let i = 0; i < iterations; i++) solver.step();
  return solver.heights;
}

describe("solver", () => {
  it("cuts the loss by at least half in 50 iterations (test 2)", () => {
    const problem = twoLampProblem(16);
    const solver = createSolver(problem);
    const first = solver.step();
    for (let i = 1; i < 50; i++) solver.step();
    const grid = { n: 16, C, boundary: solver.params.boundary };
    const after = evaluate(
      solver.heights,
      null,
      buildTerms(problem, solver.params),
      grid,
      createWorkspace(16, "float32"),
    );
    // Calibrated: 0.353 → 0.127 (36 %).
    expect(after).toBeLessThanOrEqual(0.5 * first);
  });

  it("gives a bit-identical field for the same seed and inputs (test 3)", () => {
    const a = solve(twoLampProblem(16), 25);
    const b = solve(twoLampProblem(16), 25);
    const other = solve(twoLampProblem(16, { seed: 8 }), 25);
    expect(bits(a)).toEqual(bits(b));
    expect(bits(a)).not.toEqual(bits(other));
  });

  describe("after a full solve", () => {
    const n = 32;
    let solved: Float32Array;
    beforeAll(() => {
      solved = solve(twoLampProblem(n));
    });
    const render = (lamp: { az: number; el: number }) =>
      cellBrightness(solved, n, C, lampVector(lamp.az, lamp.el), "clamped");

    it("keeps the overhead view an even grey (test 4)", () => {
      const flatStd = standardDeviation(cellBrightness(solved, n, C, OVERHEAD, "clamped"));
      const withoutFlatTerm = solve(twoLampProblem(n, { wFlat: 0 }));
      const roughStd = standardDeviation(
        cellBrightness(withoutFlatTerm, n, C, OVERHEAD, "clamped"),
      );
      // Calibrated against the prototype on the same problem: 0.0192. The port gives 0.0193;
      // without the flat-light term the overhead std is 0.157.
      expect(flatStd).toBeLessThan(0.025);
      expect(flatStd).toBeLessThan(0.25 * roughStd);
    });

    it("shows each lamp its own picture and not the other's (test 5)", () => {
      const a = discTarget(n);
      const b = leftHalfTarget(n);
      // Calibrated: 0.97 with its own picture, −0.13 with the other, for both lamps.
      expect(correlation(render(LAMP_A), a)).toBeGreaterThan(0.8);
      expect(Math.abs(correlation(render(LAMP_A), b))).toBeLessThan(0.2);
      expect(correlation(render(LAMP_B), b)).toBeGreaterThan(0.8);
      expect(Math.abs(correlation(render(LAMP_B), a))).toBeLessThan(0.2);
    });
  });
});
