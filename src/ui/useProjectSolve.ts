import { useEffect } from "react";
import { DEFAULTS, gridSize, resolveParams } from "../core/defaults";
import { initialHeights } from "../core/solver";
import { samplePreset } from "../render/samples";
import { useAppStore } from "../state/store";
import { SolveCancelled, createSolverClient } from "../workers/solverClient";

/**
 * Solves the project at full resolution whenever it changes, streaming snapshots to the stage.
 * The page opens on the two-lamp sample (crescent + نور).
 */
export function useProjectSolve(): void {
  const project = useAppStore((s) => s.project);

  useEffect(() => {
    const { setField, setProject, startSolve, updateSolve, recordProgress } =
      useAppStore.getState();

    if (!project) {
      // Show the starting field at once while the sample pictures are drawn.
      const { n, C } = DEFAULTS;
      const params = resolveParams();
      setField({ heights: initialHeights(gridSize(n, C), params.initSigma, params.seed), n, C });
      startSolve(params.iterations);
      let live = true;
      samplePreset("two").then(
        (preset) => {
          if (live && !useAppStore.getState().project) setProject(preset, "two");
        },
        (error: unknown) => {
          console.error(error);
          updateSolve({ status: "unavailable" });
        },
      );
      return () => {
        live = false;
      };
    }

    const { n, C, params } = project;
    setField({ heights: initialHeights(gridSize(n, C), params.initSigma, params.seed), n, C });
    startSolve(params.iterations);
    const client = createSolverClient();
    let live = true;
    updateSolve({ status: "solving" });
    const lamps = project.lamps.map(({ az, el, target }) => ({ az, el, target }));
    client
      .solve({ n, C, lamps, params }, (progress) => {
        if (!live) return;
        setField({ heights: progress.heights, n, C });
        recordProgress(progress);
      })
      .catch((error: unknown) => {
        if (!live || error instanceof SolveCancelled) return;
        console.error(error);
        updateSolve({ status: "unavailable" });
      });
    return () => {
      live = false;
      client.dispose();
    };
  }, [project]);
}
