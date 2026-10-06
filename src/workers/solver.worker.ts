import { expose, transfer } from "comlink";
import { createSolver, type Problem } from "../core/solver";

export interface SolveProgress {
  iteration: number;
  iterations: number;
  /** Loss of the field before this iteration's update. */
  loss: number;
  /** Milliseconds since the solve started. */
  ms: number;
  /** Snapshot of the height field, F × F; transferred to the main thread, not copied. */
  heights: Float32Array;
  done: boolean;
}

export interface SolveSummary {
  iterations: number;
  loss: number;
  ms: number;
}

/** Send a snapshot on the first iteration, every this many after, and the last. */
const SNAPSHOT_EVERY = 5;

const api = {
  /**
   * Runs a whole solve as one synchronous loop. `onProgress` is a Comlink proxy to the main
   * thread; its returned promise is not awaited, so the loop never waits on the page.
   */
  solve(problem: Problem, onProgress: (progress: SolveProgress) => unknown): SolveSummary {
    const t0 = performance.now();
    const solver = createSolver(problem);
    const { iterations } = solver.params;
    let loss = NaN;
    for (let it = 1; it <= iterations; it++) {
      loss = solver.step();
      if (it === 1 || it % SNAPSHOT_EVERY === 0 || it === iterations) {
        const heights = solver.heights.slice();
        const progress: SolveProgress = {
          iteration: it,
          iterations,
          loss,
          ms: performance.now() - t0,
          heights,
          done: it === iterations,
        };
        onProgress(transfer(progress, [heights.buffer]));
      }
    }
    return { iterations, loss, ms: performance.now() - t0 };
  },
};

export type SolverApi = typeof api;

expose(api);
