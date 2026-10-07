import { useMemo } from "react";
import { SAMPLE_PICTURES } from "../core/layouts";
import type { PictureSource, Project } from "../core/project";
import { useAppStore } from "../state/store";

/** A lamp as the page names it: "A · Crescent". */
export interface StageLamp {
  key: string;
  name: string;
  /** Language of the name, when known and not English. */
  lang?: string;
  az: number;
  el: number;
}

export const LAMP_KEYS = "ABCD";

/** A short name for a picture: the sample's name, the file name, or the first line of text. */
export function pictureName(source: PictureSource): { name: string; lang?: string } {
  switch (source.kind) {
    case "sample": {
      const pic = SAMPLE_PICTURES[source.sample];
      return pic ? { name: pic.name, ...(pic.lang ? { lang: pic.lang } : {}) } : { name: "Sample" };
    }
    case "image":
      return { name: source.name.replace(/\.[^.]+$/, "") || "Image" };
    case "text": {
      const first = source.spec.text.split("\n")[0]?.trim() ?? "";
      return { name: first.length > 24 ? `${first.slice(0, 23)}…` : first || "Text" };
    }
  }
}

export function stageLamps(project: Project | null): StageLamp[] {
  return (project?.lamps ?? []).map((lamp, i) => ({
    key: LAMP_KEYS[i] ?? String(i + 1),
    ...pictureName(lamp.source),
    az: lamp.az,
    el: lamp.el,
  }));
}

/** The lamps of the project on the stage. */
export function useStageLamps(): StageLamp[] {
  const project = useAppStore((s) => s.project);
  return useMemo(() => stageLamps(project), [project]);
}
