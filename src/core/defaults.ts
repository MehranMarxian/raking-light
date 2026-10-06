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
  /** Target brightness range: picture black maps to lo, white to hi. */
  lo: 0.1,
  hi: 0.85,
  /** Overhead (flat-light) brightness target and its loss weight. */
  flatTarget: 0.6,
  wFlat: 4,
  /** Adam learning rate and iteration count. */
  lr: 0.05,
  iterations: 300,
  /** Standard deviation of the initial random heights. */
  initSigma: 0.6,
  /** PRNG seed, as in the prototype. */
  seed: 7,
} as const;

/** Height-field samples per side: F = n · C. */
export function gridSize(n: number, C: number): number {
  return n * C;
}
