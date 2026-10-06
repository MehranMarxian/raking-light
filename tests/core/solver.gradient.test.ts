import { describe, expect, it } from "vitest";
import { resolveParams, type Boundary } from "../../src/core/defaults";
import { gaussian, mulberry32 } from "../../src/core/rng";
import { colRight, rowBelow } from "../../src/core/shading";
import { buildTerms, createWorkspace, evaluate, type Term } from "../../src/core/solver";
import { randomTargets } from "./helpers";

// docs/SOLVER.md §8, test 1: on a 16 × 16 grid (n = 4, C = 4) the analytic gradient matches central
// finite differences (step 1e-4, float64) at 20 random heights, within 1e-3 relative error.
// Heights where a nudge flips a facet between lit and unlit are skipped: max(u, 0) has a kink there.

const n = 4;
const C = 4;
const F = n * C;
const STEP = 1e-4;

/** Which facets each term lights (u > 0). */
function litPattern(h: Float64Array, terms: readonly Term[], boundary: Boundary): string {
  let out = "";
  for (const { L } of terms) {
    const [Lx, Ly, Lz] = L;
    for (let y = 0; y < F; y++) {
      const down = rowBelow(y, F, boundary);
      for (let x = 0; x < F; x++) {
        const i = y * F + x;
        const hx = h[y * F + colRight(x, F, boundary)]! - h[i]!;
        const hy = h[down + x]! - h[i]!;
        out += -Lx * hx - Ly * hy + Lz > 0 ? "1" : "0";
      }
    }
  }
  return out;
}

describe.each<Boundary>(["clamped", "periodic"])("gradient check, %s edges", (boundary) => {
  it("matches central finite differences", () => {
    const rng = mulberry32(42);
    const h = Float64Array.from({ length: F * F }, () => gaussian(rng, 0.6));
    const problem = {
      n,
      C,
      lamps: randomTargets(2, n, 5).map((target, k) => ({ az: k === 0 ? 270 : 0, el: 18, target })),
    };
    const terms = buildTerms(problem, resolveParams());
    const grid = { n, C, boundary };
    const ws = createWorkspace(n, "float64");
    const loss = (field: Float64Array) => evaluate(field, null, terms, grid, ws);

    const g = new Float64Array(F * F);
    evaluate(h, g, terms, grid, ws);

    let checked = 0;
    for (let k = 0; k < 20; k++) {
      const i = Math.floor(rng() * F * F);
      const plus = h.slice();
      const minus = h.slice();
      plus[i]! += STEP;
      minus[i]! -= STEP;
      if (litPattern(plus, terms, boundary) !== litPattern(minus, terms, boundary)) continue;

      const fd = (loss(plus) - loss(minus)) / (2 * STEP);
      const analytic = g[i]!;
      const relative = Math.abs(analytic - fd) / Math.max(Math.abs(analytic), Math.abs(fd), 1e-12);
      expect(relative, `height ${i}: analytic ${analytic}, finite difference ${fd}`).toBeLessThan(
        1e-3,
      );
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(15);
  });
});
