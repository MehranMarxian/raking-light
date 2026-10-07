import type { Boundary } from "../../core/defaults";
import { lampVector, shadeField } from "../../core/shading";
import { GAIN, SHADOW, falloff, lampTint } from "./palette";
import type { ReliefPainter } from "./painter";

/**
 * The CPU renderer, ported from the prototype's renderTo: Lambert shading per facet, coloured by
 * the shared palette. It paints the plates, and the stage when WebGL2 is not available.
 */
export function createCanvasPainter(
  canvas: HTMLCanvasElement,
  F: number,
  boundary: Boundary,
): ReliefPainter {
  canvas.width = F;
  canvas.height = F;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");
  const image = ctx.createImageData(F, F);
  const shade = new Float32Array(F * F);
  const [r0, g0, b0] = SHADOW;
  let heights: Float32Array | null = null;

  return {
    kind: "canvas2d",
    canvas,
    setHeights(next) {
      heights = next;
    },
    draw(az, el) {
      if (!heights) return;
      shadeField(heights, F, lampVector(az, el), boundary, shade);
      const [r1, g1, b1] = lampTint(el);
      const a = (az * Math.PI) / 180;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const fall = falloff(el);
      const half = F / 2;
      const d = image.data;
      for (let y = 0; y < F; y++) {
        for (let x = 0; x < F; x++) {
          const i = y * F + x;
          const p = ((x - half) * ca + (y - half) * sa) / half;
          const s = Math.min(1, shade[i]! * (1 - fall + fall * p) * GAIN);
          const j = i * 4;
          d[j] = r0 + (r1 - r0) * s;
          d[j + 1] = g0 + (g1 - g0) * s;
          d[j + 2] = b0 + (b1 - b0) * s;
          d[j + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    },
    dispose() {
      canvas.remove();
    },
  };
}
