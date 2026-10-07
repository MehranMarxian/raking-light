import { create } from "zustand";
import { DEFAULTS } from "../core/defaults";
import type { SampleLayoutId } from "../core/layouts";
import type { Project } from "../core/project";
import type { LampReport } from "../core/report";

export interface Lamp {
  /** Azimuth in degrees, image coordinates (y down): 0° = right, 270° = top. */
  az: number;
  /** Elevation above the surface in degrees. */
  el: number;
}

/** A height field and its grid: n × n cells of C × C heights, so F = n · C per side. */
export interface Field {
  heights: Float32Array;
  n: number;
  C: number;
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

/** The quick, half-resolution solve of the draft that the layout editor shows. */
export interface PreviewState {
  status: "idle" | "solving" | "done" | "unavailable";
  field: Field | null;
  report: LampReport[] | null;
}

/** (iteration, loss) */
export type LossPoint = readonly [number, number];

export const prefersReducedMotion =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

interface AppState {
  /** What the stage shows and the full solve works on. Null until the samples are drawn. */
  project: Project | null;
  /** Which sample layout the project is, if it is one. */
  presetId: SampleLayoutId | null;
  /** What the layout editor is changing; becomes the project on "Solve the surface". */
  draft: Project | null;
  preview: PreviewState;
  lamp: Lamp;
  sweeping: boolean;
  /** The surface on the stage: the starting field, then each solver snapshot. */
  field: Field | null;
  solve: SolveState;
  lossHistory: readonly LossPoint[];

  /** Shows a new project (a preset or a loaded file) and solves it; the editor starts from it. */
  setProject: (project: Project, presetId: SampleLayoutId | null) => void;
  /** Solves what the editor holds. */
  commitDraft: () => void;
  updateDraft: (recipe: (draft: Project) => Project) => void;
  setPreview: (patch: Partial<PreviewState>) => void;
  /** Someone moved the lamp: this stops the sweep. */
  moveLamp: (lamp: Partial<Lamp>) => void;
  /** Moves the lamp without stopping the sweep (the sweep itself, the height slider). */
  setLamp: (lamp: Partial<Lamp>) => void;
  setSweeping: (sweeping: boolean) => void;
  setField: (field: Field) => void;
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

/** As in the prototype: a new surface restarts the sweep, or parks the lamp on the first lamp. */
function showNew(project: Project): Partial<AppState> {
  const first = project.lamps[0];
  return prefersReducedMotion
    ? { lamp: { az: first?.az ?? 270, el: first?.el ?? DEFAULTS.solveElevation } }
    : { sweeping: true };
}

export const useAppStore = create<AppState>()((set) => ({
  project: null,
  presetId: null,
  draft: null,
  preview: { status: "idle", field: null, report: null },
  lamp: { az: 270, el: DEFAULTS.solveElevation },
  sweeping: !prefersReducedMotion,
  field: null,
  solve: {
    status: "preparing",
    iteration: 0,
    iterations: DEFAULTS.iterations,
    loss: null,
    ms: null,
  },
  lossHistory: [],

  setProject: (project, presetId) => {
    set({ project, presetId, draft: project, ...showNew(project) });
  },
  commitDraft: () => {
    set((state) =>
      state.draft ? { project: state.draft, presetId: null, ...showNew(state.draft) } : {},
    );
  },
  updateDraft: (recipe) => {
    set((state) => (state.draft ? { draft: recipe(state.draft) } : {}));
  },
  setPreview: (patch) => {
    set((state) => ({ preview: { ...state.preview, ...patch } }));
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
  setField: (field) => {
    set({ field });
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
