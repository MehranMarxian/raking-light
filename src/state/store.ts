import { create } from "zustand";
import { DEFAULTS } from "../core/defaults";

export type SolverStatus = "starting" | "ready" | "unavailable";

export interface Lamp {
  /** Azimuth in degrees, image coordinates (y down): 0° = right, 270° = top. */
  az: number;
  /** Elevation above the surface in degrees. */
  el: number;
}

interface AppState {
  lamp: Lamp;
  solver: SolverStatus;
  setSolver: (solver: SolverStatus) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  lamp: { az: 270, el: DEFAULTS.solveElevation },
  solver: "starting",
  setSolver: (solver) => {
    set({ solver });
  },
}));
