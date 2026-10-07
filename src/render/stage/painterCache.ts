import type { Boundary } from "../../core/defaults";
import { createCanvasPainter } from "./canvas2d";
import type { ReliefPainter } from "./painter";

const painters = new WeakMap<HTMLCanvasElement, { F: number; painter: ReliefPainter }>();

/** A canvas painter for this canvas and field size, made once and reused (plates, previews). */
export function cachedCanvasPainter(
  canvas: HTMLCanvasElement,
  F: number,
  boundary: Boundary,
): ReliefPainter {
  const cached = painters.get(canvas);
  if (cached?.F === F) return cached.painter;
  const painter = createCanvasPainter(canvas, F, boundary);
  painters.set(canvas, { F, painter });
  return painter;
}
