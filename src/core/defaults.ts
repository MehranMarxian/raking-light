/**
 * How the height field is treated past its last row and column.
 * - "clamped": Neumann edges; the forward difference past the edge is 0. Use for anything physical.
 * - "periodic": wraps around like the prototype. Kept so the port can be checked against it.
 */
export type Boundary = "clamped" | "periodic";

/** Solver parameters; docs/SOLVER.md §2, §4 and §5. */
export interface SolverParams {
  /** Target brightness range: picture black maps to lo, white to hi. */
  lo: number;
  hi: number;
  /** Overhead (flat-light) brightness target and its loss weight. */
  flatTarget: number;
  wFlat: number;
  /** Adam learning rate and iteration count. */
  lr: number;
  iterations: number;
  /** Standard deviation of the initial random heights. */
  initSigma: number;
  /** PRNG seed for the initial heights. */
  seed: number;
  boundary: Boundary;
}

/**
 * Tuned solver defaults, from docs/SOLVER.md §5.
 * Heights are in facet-pitch units; angles are in degrees.
 */
export const DEFAULTS = {
  /** Picture cells per side. */
  n: 96,
  /** Heights per cell side; each cell is a C × C patch of facets. */
  C: 4,
  /** Lamp elevation the pictures are solved for. */
  solveElevation: 18,
  lo: 0.1,
  hi: 0.85,
  flatTarget: 0.6,
  wFlat: 4,
  lr: 0.05,
  iterations: 300,
  initSigma: 0.6,
  /** As in the prototype. */
  seed: 7,
  boundary: "clamped",
} as const satisfies Partial<SolverParams> & { n: number; C: number; solveElevation: number };

/** Adam constants (docs/SOLVER.md §4). */
export const ADAM = { beta1: 0.9, beta2: 0.999, eps: 1e-12 } as const;

/** Tikhonov weight added to the gradient to keep the null space from drifting (docs/SOLVER.md §2). */
export const TIKHONOV = 1e-7;

/** Height-field samples per side: F = n · C. */
export function gridSize(n: number, C: number): number {
  return n * C;
}

/** Solver parameters with the defaults filled in. */
export function resolveParams(overrides: Partial<SolverParams> = {}): SolverParams {
  const { lo, hi, flatTarget, wFlat, lr, iterations, initSigma, seed, boundary } = DEFAULTS;
  return { lo, hi, flatTarget, wFlat, lr, iterations, initSigma, seed, boundary, ...overrides };
}
