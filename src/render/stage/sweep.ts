import { normalizeAz } from "./lamp";

/** How long the sweep rests on each lamp, and how long it takes to travel to the next. */
export const DWELL_MS = 1600;
export const MOVE_MS = 1900;
const SEGMENT_MS = DWELL_MS + MOVE_MS;

const easeInOut = (v: number) => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);

/**
 * Azimuth of the sweeping lamp `t` ms into the sweep, as in the prototype: it rests on each lamp,
 * then glides to the next one, always clockwise, easing in and out.
 */
export function sweepAngle(t: number, azimuths: readonly number[]): number {
  const count = azimuths.length;
  if (count === 0) return 0;
  const time = Math.max(0, t);
  const segment = Math.floor(time / SEGMENT_MS) % count;
  const u = time % SEGMENT_MS;
  const from = azimuths[segment]!;
  if (u < DWELL_MS) return normalizeAz(from);
  const to = azimuths[(segment + 1) % count]!;
  const clockwise = normalizeAz(to - from);
  return normalizeAz(from + clockwise * easeInOut((u - DWELL_MS) / MOVE_MS));
}

/** The sweep time at which the lamp starts resting on lamp `index`. */
export function sweepStartTime(index: number): number {
  return index * SEGMENT_MS;
}
