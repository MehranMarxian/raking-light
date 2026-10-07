/** Small canvas paintings for the method section, ported from the prototype. */

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");
  return ctx;
}

/** An n × n target in warm greys, as the prototype shows its thumbnails. */
export function paintTarget(canvas: HTMLCanvasElement, target: Float32Array, n: number): void {
  canvas.width = n;
  canvas.height = n;
  const ctx = context(canvas);
  const image = ctx.createImageData(n, n);
  const d = image.data;
  for (let i = 0; i < n * n; i++) {
    const v = target[i]! * 255;
    d[i * 4] = v;
    d[i * 4 + 1] = v * 0.97;
    d[i * 4 + 2] = v * 0.92;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

/** The height field as a displacement map: white is high, black is low. */
export function paintHeightMap(canvas: HTMLCanvasElement, heights: Float32Array, F: number): void {
  canvas.width = F;
  canvas.height = F;
  const ctx = context(canvas);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of heights) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  const image = ctx.createImageData(F, F);
  const d = image.data;
  for (let i = 0; i < F * F; i++) {
    const v = ((heights[i]! - lo) / span) * 255;
    d[i * 4] = v;
    d[i * 4 + 1] = v;
    d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
