import {
  ADAM,
  TIKHONOV,
  gridSize,
  resolveParams,
  type Boundary,
  type SolverParams,
} from "./defaults";
import { gaussian, mulberry32 } from "./rng";
import {
  OVERHEAD,
  accumulateCellSums,
  colRight,
  lampVector,
  rowBelow,
  type FloatArray,
  type Vec3,
} from "./shading";

/** One lamp of a problem: where it stands and the picture it should show. */
export interface LampTarget {
  /** Azimuth in degrees, image coordinates (y down): 0° = right, 270° = top. */
  az: number;
  /** Elevation in degrees. */
  el: number;
  /** n × n picture, row-major, values in [0, 1]. */
  target: Float32Array;
}

/** Everything the solver needs; plain data, so it can cross into a worker. */
export interface Problem {
  /** Picture cells per side. */
  n: number;
  /** Heights per cell side. */
  C: number;
  lamps: readonly LampTarget[];
  params?: Partial<SolverParams>;
}

/** One loss term: a lamp direction, its per-cell target brightness and its weight. */
export interface Term {
  L: Vec3;
  T: Float32Array;
  w: number;
}

export interface Grid {
  n: number;
  C: number;
  boundary: Boundary;
}

/** Scratch buffers for `evaluate`, n × n each, in the precision of the heights. */
export interface Workspace {
  sums: FloatArray;
  residual: FloatArray;
}

/**
 * The loss terms of a problem (docs/SOLVER.md §2): one per lamp, its picture mapped to [lo, hi],
 * then the flat-light term that asks the overhead view to stay one even grey.
 */
export function buildTerms(problem: Problem, params: SolverParams): Term[] {
  const cells = problem.n * problem.n;
  const { lo, hi, flatTarget, wFlat } = params;
  const terms = problem.lamps.map(({ az, el, target }): Term => {
    const T = new Float32Array(cells);
    for (let c = 0; c < cells; c++) T[c] = lo + (hi - lo) * target[c]!;
    return { L: lampVector(az, el), T, w: 1 };
  });
  terms.push({ L: OVERHEAD, T: new Float32Array(cells).fill(flatTarget), w: wFlat });
  return terms;
}

export function createWorkspace(n: number, precision: "float32" | "float64"): Workspace {
  const make = () => (precision === "float32" ? new Float32Array(n * n) : new Float64Array(n * n));
  return { sums: make(), residual: make() };
}

/**
 * Loss L = Σ_terms w · mean over cells (cellmean(s) − T)², and, when `g` is given, its analytic
 * gradient with respect to every height (docs/SOLVER.md §3), written into `g`. Works in float32
 * (solving) or float64 (gradient check). The Tikhonov term is not included; the optimizer adds it.
 */
export function evaluate(
  h: FloatArray,
  g: FloatArray | null,
  terms: readonly Term[],
  grid: Grid,
  ws: Workspace,
): number {
  const { n, C, boundary } = grid;
  const F = n * C;
  const cells = n * n;
  const inv = 1 / (C * C);
  const { sums, residual } = ws;
  g?.fill(0);
  let loss = 0;
  for (const { L, T, w } of terms) {
    accumulateCellSums(h, n, C, L, boundary, sums);
    for (let c = 0; c < cells; c++) {
      const d = sums[c]! * inv - T[c]!;
      residual[c] = d;
      loss += w * d * d;
    }
    if (!g) continue;

    const [Lx, Ly, Lz] = L;
    const sc = (2 * w * inv) / cells;
    for (let y = 0; y < F; y++) {
      const row = y * F;
      const down = rowBelow(y, F, boundary);
      const cy = ((y / C) | 0) * n;
      for (let x = 0; x < F; x++) {
        const i = row + x;
        const h0 = h[i]!;
        const right = row + colRight(x, F, boundary);
        const hx = h[right]! - h0;
        const hy = h[down + x]! - h0;
        const u = -Lx * hx - Ly * hy + Lz;
        if (u <= 0) continue; // unlit facet: s = 0, no gradient
        const q2 = 1 + hx * hx + hy * hy;
        const q = Math.sqrt(q2);
        const q3 = q2 * q;
        const d = residual[cy + ((x / C) | 0)]! * sc;
        const dhx = d * (-Lx / q - (u * hx) / q3);
        const dhy = d * (-Ly / q - (u * hy) / q3);
        g[right]! += dhx;
        g[down + x]! += dhy;
        g[i]! -= dhx + dhy;
      }
    }
  }
  return loss / cells;
}

/** The starting field: h ~ N(0, σ²) from the seeded PRNG (docs/SOLVER.md §4). */
export function initialHeights(F: number, sigma: number, seed: number): Float32Array {
  const rng = mulberry32(seed);
  const h = new Float32Array(F * F);
  for (let i = 0; i < h.length; i++) h[i] = gaussian(rng, sigma);
  return h;
}

export interface Solver {
  /** Height-field samples per side. */
  readonly F: number;
  readonly params: SolverParams;
  /** The live height field, F × F row-major; `step` updates it in place. */
  readonly heights: Float32Array;
  /** Iterations taken so far. */
  readonly iteration: number;
  /** One Adam iteration. Returns the loss of the field as it was before the update. */
  step(): number;
}

/** A deterministic solver: the same problem and seed give a bit-identical height field. */
export function createSolver(problem: Problem): Solver {
  const params = resolveParams(problem.params);
  const { n, C } = problem;
  const F = gridSize(n, C);
  const NN = F * F;
  const h = initialHeights(F, params.initSigma, params.seed);
  const m = new Float32Array(NN);
  const v = new Float32Array(NN);
  const g = new Float32Array(NN);
  const terms = buildTerms(problem, params);
  const grid: Grid = { n, C, boundary: params.boundary };
  const ws = createWorkspace(n, "float32");
  const { beta1: b1, beta2: b2, eps } = ADAM;
  const { lr } = params;
  let it = 0;

  return {
    F,
    params,
    heights: h,
    get iteration() {
      return it;
    },
    step() {
      it++;
      const loss = evaluate(h, g, terms, grid, ws);
      const c1 = 1 - Math.pow(b1, it);
      const c2 = 1 - Math.pow(b2, it);
      for (let i = 0; i < NN; i++) {
        const gi = g[i]! + TIKHONOV * h[i]!;
        m[i] = b1 * m[i]! + (1 - b1) * gi;
        v[i] = b2 * v[i]! + (1 - b2) * gi * gi;
        h[i]! -= (lr * (m[i]! / c1)) / (Math.sqrt(v[i]! / c2) + eps);
      }
      return loss;
    },
  };
}
