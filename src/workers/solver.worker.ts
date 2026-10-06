import { expose } from "comlink";
import { DEFAULTS, gridSize } from "../core/defaults";

// M0 stub: proves the worker bundles and answers under the deployed base path.
// M1 replaces it with the solver wrapper that streams progress
// (iteration, loss, height snapshot) as transferables.
const api = {
  ping(): string {
    const F = gridSize(DEFAULTS.n, DEFAULTS.C);
    return `solver ready · ${F} × ${F}`;
  },
};

export type SolverApi = typeof api;

expose(api);
