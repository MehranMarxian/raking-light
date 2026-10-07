import { useEffect } from "react";
import { reportForField } from "../core/report";
import { halveTarget } from "../core/targets";
import { useAppStore } from "../state/store";
import { SolveCancelled, createSolverClient } from "../workers/solverClient";

/** The preview solves at half the cells (48 for the default 96) and stops early. */
export const PREVIEW_ITERATIONS = 150;
const DEBOUNCE_MS = 250;

/**
 * While the layout is being edited, re-solves the draft at half resolution shortly after each
 * change, then measures how cleanly each lamp shows its picture (the ghost report).
 */
export function useDraftPreview(): void {
  const draft = useAppStore((s) => s.draft);

  useEffect(() => {
    if (!draft) return;
    const { setPreview } = useAppStore.getState();
    const client = createSolverClient();
    let live = true;

    const timer = setTimeout(() => {
      const n = draft.n / 2;
      const { C } = draft;
      const lamps = draft.lamps.map(({ az, el, target }) => ({
        az,
        el,
        target: halveTarget(target, draft.n),
      }));
      const params = { ...draft.params, iterations: PREVIEW_ITERATIONS };
      setPreview({ status: "solving" });
      client
        .solve({ n, C, lamps, params }, (progress) => {
          if (!live || !progress.done) return;
          setPreview({
            status: "done",
            field: { heights: progress.heights, n, C },
            report: reportForField(progress.heights, n, C, lamps, params.boundary),
          });
        })
        .catch((error: unknown) => {
          if (!live || error instanceof SolveCancelled) return;
          console.error(error);
          setPreview({ status: "unavailable" });
        });
    }, DEBOUNCE_MS);

    return () => {
      live = false;
      clearTimeout(timer);
      client.dispose();
    };
  }, [draft]);
}
