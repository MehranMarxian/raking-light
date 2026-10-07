import { angularDistance } from "../../core/layouts";

/** Azimuth folded into [0, 360). */
export function normalizeAz(az: number): number {
  return ((az % 360) + 360) % 360;
}

/** Azimuth, in image coordinates (y down), of a point at (dx, dy) from the stage centre. */
export function azimuthOf(dx: number, dy: number): number {
  return normalizeAz((Math.atan2(dy, dx) * 180) / Math.PI);
}

/** Museum-plate azimuth: 270 → "270°", 0 → "000°". */
export function formatAz(az: number): string {
  return `${String(Math.round(normalizeAz(az)) % 360).padStart(3, "0")}°`;
}

/** A lamp within this many degrees of a picture's azimuth shows that picture. */
export const NEAR_LAMP_DEG = 14;

/** Index of the lamp whose azimuth is within NEAR_LAMP_DEG of `az`, if any. */
export function nearestLampIndex(az: number, azimuths: readonly number[]): number | undefined {
  let best: number | undefined;
  let bestDistance = Infinity;
  azimuths.forEach((lampAz, i) => {
    const d = angularDistance(az, lampAz);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return bestDistance <= NEAR_LAMP_DEG ? best : undefined;
}

export type LampReading =
  { kind: "flat" } | { kind: "too-high" } | { kind: "lamp"; index: number } | { kind: "between" };

/** What the stage shows with the lamp at (az, el), as the prototype's readout words it. */
export function readLamp(az: number, el: number, azimuths: readonly number[]): LampReading {
  if (el >= 70) return { kind: "flat" };
  const index = el < 40 ? nearestLampIndex(az, azimuths) : undefined;
  if (index !== undefined) return { kind: "lamp", index };
  return el >= 40 ? { kind: "too-high" } : { kind: "between" };
}

/** Degrees an arrow key turns the lamp: 3°, or 15° with Shift. Null for other keys. */
export function keyStep(key: string, shift: boolean): number | null {
  const step = shift ? 15 : 3;
  if (key === "ArrowRight" || key === "ArrowUp") return step;
  if (key === "ArrowLeft" || key === "ArrowDown") return -step;
  return null;
}
