import type { Boundary } from "../../core/defaults";
import { lampVector, shadeField } from "../../core/shading";

export interface ReliefPainter {
  paint(heights: Float32Array, az: number, el: number): void;
}

/** Plaster in full shadow, RGB. */
const SHADOW = [17, 18, 23] as const;

/**
 * Interim stage renderer, ported from the prototype's renderTo: Lambert shading per facet, a
 * warmer and stronger lamp when it is low, and a gentle falloff across the disc away from it.
 * The WebGL2 stage replaces it in M2.
 */
export function createReliefPainter(
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

  return {
    paint(heights, az, el) {
      shadeField(heights, F, lampVector(az, el), boundary, shade);
      // Lamp colour: neutral overhead, warmer as it drops.
      const k = Math.min(1, Math.max(0, (60 - el) / 50));
      const r1 = 236 + 19 * k;
      const g1 = 229 - 3 * k;
      const b1 = 216 - 40 * k;
      const a = (az * Math.PI) / 180;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const fall = 0.14 * k;
      const half = F / 2;
      const d = image.data;
      for (let y = 0; y < F; y++) {
        for (let x = 0; x < F; x++) {
          const i = y * F + x;
          const p = ((x - half) * ca + (y - half) * sa) / half;
          const s = Math.min(1, shade[i]! * (1 - fall + fall * p) * 1.12);
          const j = i * 4;
          d[j] = r0 + (r1 - r0) * s;
          d[j + 1] = g0 + (g1 - g0) * s;
          d[j + 2] = b0 + (b1 - b0) * s;
          d[j + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    },
  };
}
