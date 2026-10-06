import { create } from "zustand";
import { DEFAULTS } from "../core/defaults";

export interface Lamp {
  /** Azimuth in degrees, image coordinates (y down): 0° = right, 270° = top. */
  az: number;
  /** Elevation above the surface in degrees. */
  el: number;
}

export type SolveStatus = "preparing" | "solving" | "done" | "unavailable";

export interface SolveState {
  status: SolveStatus;
  iteration: number;
  iterations: number;
  loss: number | null;
  /** Milliseconds since the solve started. */
  ms: number | null;
}

interface AppState {
  lamp: Lamp;
  /** The surface on the stage, F × F: the starting field, then each solver snapshot. */
  heights: Float32Array | null;
  solve: SolveState;
  setLamp: (lamp: Lamp) => void;
  setHeights: (heights: Float32Array) => void;
  updateSolve: (patch: Partial<SolveState>) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  lamp: { az: 270, el: DEFAULTS.solveElevation },
  heights: null,
  solve: {
    status: "preparing",
    iteration: 0,
    iterations: DEFAULTS.iterations,
    loss: null,
    ms: null,
  },
  setLamp: (lamp) => {
    set({ lamp });
  },
  setHeights: (heights) => {
    set({ heights });
  },
  updateSolve: (patch) => {
    set((state) => ({ solve: { ...state.solve, ...patch } }));
  },
}));
