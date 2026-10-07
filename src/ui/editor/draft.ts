import { DEFAULTS } from "../../core/defaults";
import { MAX_LAMPS, MIN_LAMPS, freeAzimuth } from "../../core/layouts";
import type { Project, ProjectLamp } from "../../core/project";

/** Edits to a draft project. Each returns a new project, so the store sees the change. */

export function withLamp(draft: Project, index: number, patch: Partial<ProjectLamp>): Project {
  return {
    ...draft,
    lamps: draft.lamps.map((lamp, i) => (i === index ? { ...lamp, ...patch } : lamp)),
  };
}

export function withoutLamp(draft: Project, index: number): Project {
  if (draft.lamps.length <= MIN_LAMPS) return draft;
  return { ...draft, lamps: draft.lamps.filter((_, i) => i !== index) };
}

/** Adds a lamp in the widest gap, at the solve elevation, showing the given picture. */
export function withAddedLamp(
  draft: Project,
  picture: Pick<ProjectLamp, "source" | "target">,
): Project {
  if (draft.lamps.length >= MAX_LAMPS) return draft;
  const az = freeAzimuth(draft.lamps.map((l) => l.az));
  return { ...draft, lamps: [...draft.lamps, { az, el: DEFAULTS.solveElevation, ...picture }] };
}

/** The first sample picture no lamp shows yet, so a new lamp gets something different. */
export function unusedSample(draft: Project): number {
  const used = new Set(
    draft.lamps.flatMap((l) => (l.source.kind === "sample" ? [l.source.sample] : [])),
  );
  return [0, 1, 2].find((k) => !used.has(k)) ?? 0;
}
