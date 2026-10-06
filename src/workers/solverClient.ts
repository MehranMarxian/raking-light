import { proxy, wrap } from "comlink";
import type { Problem } from "../core/solver";
import type { SolveProgress, SolveSummary, SolverApi } from "./solver.worker";

export type { SolveProgress, SolveSummary };

/** Rejection reason for a solve that was replaced by a newer one or disposed. */
export class SolveCancelled extends Error {
  override name = "SolveCancelled";
}

export interface SolverClient {
  /** Runs one solve in a fresh worker. A new call cancels the solve in flight. */
  solve(problem: Problem, onProgress: (progress: SolveProgress) => void): Promise<SolveSummary>;
  dispose(): void;
}

export function createSolverClient(): SolverClient {
  let worker: Worker | null = null;
  let cancel: ((reason: Error) => void) | null = null;

  // The worker runs a solve as one synchronous loop, so cancelling means terminating it.
  const stop = () => {
    worker?.terminate();
    worker = null;
    cancel?.(new SolveCancelled("Solve cancelled"));
    cancel = null;
  };

  return {
    solve(problem, onProgress) {
      stop();
      const current = new Worker(new URL("./solver.worker.ts", import.meta.url), {
        type: "module",
        name: "solver",
      });
      worker = current;
      const api = wrap<SolverApi>(current);
      return new Promise<SolveSummary>((resolve, reject) => {
        cancel = reject;
        // A worker that fails to load never answers, so listen for the error too.
        current.addEventListener(
          "error",
          () => {
            reject(new Error("Solver worker failed to load"));
          },
          { once: true },
        );
        api.solve(problem, proxy(onProgress)).then(resolve, reject);
      }).finally(() => {
        if (worker === current) {
          current.terminate();
          worker = null;
          cancel = null;
        }
      });
    },
    dispose: stop,
  };
}
