import { wrap, type Remote } from "comlink";
import type { SolverApi } from "./solver.worker";

export interface SolverConnection {
  api: Remote<SolverApi>;
  /** Resolves once the worker has loaded and answered; rejects if it fails to load. */
  ready: Promise<void>;
  dispose: () => void;
}

export function connectSolver(): SolverConnection {
  const worker = new Worker(new URL("./solver.worker.ts", import.meta.url), {
    type: "module",
    name: "solver",
  });
  const api = wrap<SolverApi>(worker);
  const ready = new Promise<void>((resolve, reject) => {
    // A worker that fails to load never answers, so listen for the error too.
    worker.addEventListener(
      "error",
      () => {
        reject(new Error("Solver worker failed to load"));
      },
      { once: true },
    );
    api.ping().then(() => {
      resolve();
    }, reject);
  });
  return {
    api,
    ready,
    dispose: () => {
      worker.terminate();
    },
  };
}
