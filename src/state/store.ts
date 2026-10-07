import { create } from "zustand";
import { DEFAULTS } from "../core/defaults";
import type { SAMPLE_LAYOUTS } from "../core/layouts";

export interface Lamp {
  /** Azimuth in degrees, image coordinates (y down): 0° = right, 270° = top. */
  az: number;
  /** Elevation above the surface in degrees. */
  el: number;
}

/** Which sample layout is solved: two lamps 90° apart, or three 120° apart. */
export type Mode = keyof typeof SAMPLE_LAYOUTS;

export type SolveStatus = "preparing" | "solving" | "done" | "unavailable";

export interface SolveState {
  status: SolveStatus;
  iteration: number;
  iterations: number;
  loss: number | null;
  /** Milliseconds since the solve started. */
  ms: number | null;
}

/** (iteration, loss) */
export type LossPoint = readonly [number, number];

export const prefersReducedMotion =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

interface AppState {
  mode: Mode;
  lamp: Lamp;
  sweeping: boolean;
  /** The surface on the stage, F × F: the starting field, then each solver snapshot. */
  heights: Float32Array | null;
  /** The sample pictures as n × n targets, once drawn. */
  targets: readonly Float32Array[] | null;
  solve: SolveState;
  lossHistory: readonly LossPoint[];

  setMode: (mode: Mode) => void;
  /** Someone moved the lamp: this stops the sweep. */
  moveLamp: (lamp: Partial<Lamp>) => void;
  /** Moves the lamp without stopping the sweep (the sweep itself, the height slider). */
  setLamp: (lamp: Partial<Lamp>) => void;
  setSweeping: (sweeping: boolean) => void;
  setHeights: (heights: Float32Array) => void;
  setTargets: (targets: readonly Float32Array[]) => void;
  /** Resets progress for a new solve. */
  startSolve: (iterations: number) => void;
  updateSolve: (patch: Partial<SolveState>) => void;
  recordProgress: (progress: {
    iteration: number;
    loss: number;
    ms: number;
    done: boolean;
  }) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  mode: "two",
  lamp: { az: 270, el: DEFAULTS.solveElevation },
  sweeping: !prefersReducedMotion,
  heights: null,
  targets: null,
  solve: {
    status: "preparing",
    iteration: 0,
    iterations: DEFAULTS.iterations,
    loss: null,
    ms: null,
  },
  lossHistory: [],

  setMode: (mode) => {
    // As in the prototype: a new layout restarts the sweep, or parks the lamp on lamp A.
    set(
      prefersReducedMotion
        ? { mode, lamp: { az: 270, el: DEFAULTS.solveElevation } }
        : { mode, sweeping: true },
    );
  },
  moveLamp: (lamp) => {
    set((state) => ({ lamp: { ...state.lamp, ...lamp }, sweeping: false }));
  },
  setLamp: (lamp) => {
    set((state) => ({ lamp: { ...state.lamp, ...lamp } }));
  },
  setSweeping: (sweeping) => {
    set({ sweeping });
  },
  setHeights: (heights) => {
    set({ heights });
  },
  setTargets: (targets) => {
    set({ targets });
  },
  startSolve: (iterations) => {
    set({
      solve: { status: "preparing", iteration: 0, iterations, loss: null, ms: null },
      lossHistory: [],
    });
  },
  updateSolve: (patch) => {
    set((state) => ({ solve: { ...state.solve, ...patch } }));
  },
  recordProgress: ({ iteration, loss, ms, done }) => {
    set((state) => ({
      solve: { ...state.solve, status: done ? "done" : "solving", iteration, loss, ms },
      lossHistory: [...state.lossHistory, [iteration, loss]],
    }));
  },
}));
