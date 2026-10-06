export interface PrototypeSnapshot {
  it: number;
  loss: number;
  h: Float32Array;
}

/** The prototype's solver loop; see prototype-solver.js. Periodic boundaries. */
export function prototypeSolve(data: {
  targets: number[][];
  az: number[];
  elev: number;
  n: number;
  C: number;
  iters: number;
  seed: number;
}): PrototypeSnapshot[];
