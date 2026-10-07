import { DEFAULTS } from "./defaults";

export interface Picture {
  key: string;
  name: string;
  /** Language of the name, when it is not English. */
  lang?: string;
}

/** A lamp in a layout: where it stands and which picture it shows. */
export interface LampPlacement {
  picture: number;
  /** Azimuth in degrees, image coordinates (y down): 0° = right, 270° = top. */
  az: number;
  /** Elevation in degrees. */
  el: number;
}

/** The prototype's sample pictures. */
export const SAMPLE_PICTURES: readonly Picture[] = [
  { key: "A", name: "Crescent" },
  { key: "B", name: "Khatam star" },
  { key: "C", name: "نور", lang: "fa" },
];

const el = DEFAULTS.solveElevation;

/**
 * The prototype's layouts. Two lamps 90° apart separate almost perfectly; three at 120° leave
 * faint negative ghosts (CLAUDE.md, key finding 1).
 */
export const SAMPLE_LAYOUTS = {
  two: [
    { picture: 0, az: 270, el },
    { picture: 2, az: 0, el },
  ],
  three: [
    { picture: 0, az: 270, el },
    { picture: 1, az: 30, el },
    { picture: 2, az: 150, el },
  ],
} as const satisfies Record<string, readonly LampPlacement[]>;

/** Smallest angle between two azimuths, in degrees, in [0, 180]. */
export function angularDistance(a: number, b: number): number {
  const d = (((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/** A layout may have this many lamps. */
export const MIN_LAMPS = 2;
export const MAX_LAMPS = 4;

/** Lamps within this many degrees of facing each other show near-inverse pictures. */
export const OPPOSITE_TOLERANCE_DEG = 20;
/** Pictures cross-fade over about ±25°, so lamps closer than twice that bleed into each other. */
export const CROWDED_DEG = 50;
/** Above this elevation pictures wash out; the readout calls the lamp too high. */
export const HIGH_EL_DEG = 40;

export type LayoutWarning =
  | { kind: "opposite"; lamps: [number, number] }
  | { kind: "crowded"; lamps: [number, number]; apart: number }
  | { kind: "ghosts"; count: number }
  | { kind: "high"; lamp: number };

/** What a layout will cost, from the findings in CLAUDE.md and docs/SOLVER.md §6. */
export function layoutWarnings(lamps: readonly { az: number; el: number }[]): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  lamps.forEach((a, i) => {
    lamps.forEach((b, j) => {
      if (j <= i) return;
      const apart = angularDistance(a.az, b.az);
      if (apart >= 180 - OPPOSITE_TOLERANCE_DEG) warnings.push({ kind: "opposite", lamps: [i, j] });
      else if (apart < CROWDED_DEG) warnings.push({ kind: "crowded", lamps: [i, j], apart });
    });
  });
  if (lamps.length >= 3) warnings.push({ kind: "ghosts", count: lamps.length });
  lamps.forEach((lamp, i) => {
    if (lamp.el > HIGH_EL_DEG) warnings.push({ kind: "high", lamp: i });
  });
  return warnings;
}

/** An azimuth for a new lamp: the middle of the widest gap between the existing ones. */
export function freeAzimuth(azimuths: readonly number[]): number {
  if (azimuths.length === 0) return 270;
  const sorted = azimuths.map((a) => ((a % 360) + 360) % 360).sort((a, b) => a - b);
  let best = sorted[0]! + 180;
  let widest = -1;
  sorted.forEach((a, i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1]! : sorted[0]! + 360;
    if (next - a > widest) {
      widest = next - a;
      best = a + widest / 2;
    }
  });
  return Math.round(best) % 360;
}
