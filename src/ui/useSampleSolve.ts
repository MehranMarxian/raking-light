import { useEffect } from "react";
import { DEFAULTS, gridSize, resolveParams } from "../core/defaults";
import { SAMPLE_LAYOUTS } from "../core/layouts";
import { initialHeights } from "../core/solver";
import { loadSampleTargets } from "../render/samples";
import { useAppStore } from "../state/store";
import { SolveCancelled, createSolverClient } from "../workers/solverClient";

/** Solves the two-lamp sample (crescent + نور) when the page opens, streaming it to the store. */
export function useSampleSolve(): void {
  useEffect(() => {
    const { setHeights, updateSolve } = useAppStore.getState();
    const { n, C } = DEFAULTS;
    const params = resolveParams();
    // Show the solver's starting field at once; the snapshots continue from it.
    setHeights(initialHeights(gridSize(n, C), params.initSigma, params.seed));
    updateSolve({
      status: "preparing",
      iteration: 0,
      iterations: params.iterations,
      loss: null,
      ms: null,
    });

    const client = createSolverClient();
    let live = true;

    const run = async () => {
      const targets = await loadSampleTargets(n);
      if (!live) return;
      const lamps = SAMPLE_LAYOUTS.two.map(({ picture, az, el }) => {
        const target = targets[picture];
        if (!target) throw new Error(`Missing sample picture ${String(picture)}`);
        return { az, el, target };
      });
      updateSolve({ status: "solving" });
      await client.solve({ n, C, lamps, params }, (progress) => {
        if (!live) return;
        setHeights(progress.heights);
        updateSolve({
          status: progress.done ? "done" : "solving",
          iteration: progress.iteration,
          loss: progress.loss,
          ms: progress.ms,
        });
      });
    };

    run().catch((error: unknown) => {
      if (!live || error instanceof SolveCancelled) return;
      console.error(error);
      updateSolve({ status: "unavailable" });
    });

    return () => {
      live = false;
      client.dispose();
    };
  }, []);
}
