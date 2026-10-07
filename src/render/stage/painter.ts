import type { Boundary } from "../../core/defaults";
import { createCanvasPainter } from "./canvas2d";
import { createWebGLPainter } from "./webgl";

/** Paints a height field as plaster under one lamp. */
export interface ReliefPainter {
  readonly kind: "webgl2" | "canvas2d";
  readonly canvas: HTMLCanvasElement;
  /** Use this field from now on. Cheap to call again with the same array. */
  setHeights(heights: Float32Array): void;
  draw(az: number, el: number): void;
  dispose(): void;
}

function makeCanvas(F: number, className: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = F;
  canvas.height = F;
  canvas.className = className;
  return canvas;
}

/**
 * The stage painter: WebGL2 when the browser has it, the canvas renderer otherwise. It renders
 * at F × F, one pixel per facet, and the browser scales it up, as in the prototype.
 */
export function createStagePainter(
  host: HTMLElement,
  F: number,
  boundary: Boundary,
  className: string,
): ReliefPainter {
  const glCanvas = makeCanvas(F, className);
  try {
    const gl = createWebGLPainter(glCanvas, F, boundary);
    if (gl) {
      host.append(glCanvas);
      return gl;
    }
  } catch (error) {
    console.warn("WebGL2 stage failed; falling back to canvas", error);
  }
  // A canvas that has a WebGL context cannot give a 2D one, so start fresh.
  const canvas = makeCanvas(F, className);
  host.append(canvas);
  return createCanvasPainter(canvas, F, boundary);
}
