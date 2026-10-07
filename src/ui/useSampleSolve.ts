import { useEffect } from "react";
import { DEFAULTS, gridSize, resolveParams } from "../core/defaults";
import { SAMPLE_LAYOUTS } from "../core/layouts";
import { initialHeights } from "../core/solver";
import { loadSampleTargets } from "../render/samples";
import { useAppStore } from "../state/store";
import { SolveCancelled, createSolverClient } from "../workers/solverClient";

/**
 * Solves the sample layout for the current mode, and again whenever the mode changes, streaming
 * each snapshot to the store. Two lamps: crescent + نور. Three: crescent + khatam star + نور.
 */
export function useSampleSolve(): void {
  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    const { setHeights, setTargets, startSolve, updateSolve, recordProgress } =
      useAppStore.getState();
    const { n, C } = DEFAULTS;
    const params = resolveParams();
    // Show the solver's starting field at once; the snapshots continue from it.
    setHeights(initialHeights(gridSize(n, C), params.initSigma, params.seed));
    startSolve(params.iterations);

    const client = createSolverClient();
    let live = true;

    const run = async () => {
      const targets = await loadSampleTargets(n);
      if (!live) return;
      setTargets(targets);
      const lamps = SAMPLE_LAYOUTS[mode].map(({ picture, az, el }) => {
        const target = targets[picture];
        if (!target) throw new Error(`Missing sample picture ${String(picture)}`);
        return { az, el, target };
      });
      updateSolve({ status: "solving" });
      await client.solve({ n, C, lamps, params }, (progress) => {
        if (!live) return;
        setHeights(progress.heights);
        recordProgress(progress);
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
  }, [mode]);
}
