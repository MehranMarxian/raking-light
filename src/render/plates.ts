import type { LampPlacement } from "../core/layouts";
import { normalizeAz } from "./stage/lamp";

export type PlateSpec =
  | { kind: "overhead"; az: number; el: number }
  | { kind: "lamp"; index: number; az: number; el: number }
  | { kind: "between"; az: number; el: number };

/**
 * The documentation plates, as in the prototype: the surface under overhead light, then under
 * each lamp. With fewer than three lamps a fourth plate shows the cross-fade halfway along the
 * clockwise arc between the first two.
 */
export function plateSpecs(lamps: readonly LampPlacement[]): PlateSpec[] {
  const plates: PlateSpec[] = [{ kind: "overhead", az: 45, el: 90 }];
  lamps.forEach((lamp, index) => plates.push({ kind: "lamp", index, az: lamp.az, el: lamp.el }));
  const [first, second] = lamps;
  if (plates.length < 4 && first && second) {
    const arc = normalizeAz(second.az - first.az);
    plates.push({ kind: "between", az: normalizeAz(first.az + arc / 2), el: first.el });
  }
  return plates;
}
