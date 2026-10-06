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
