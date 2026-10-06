import type { Boundary } from "./defaults";

export type FloatArray = Float32Array | Float64Array;
export type Vec3 = readonly [number, number, number];

/** The flat-light lamp, straight overhead. */
export const OVERHEAD: Vec3 = [0, 0, 1];

/**
 * Unit vector toward a lamp at azimuth `az` and elevation `el`, in degrees. Image coordinates with
 * y pointing down: 0° puts the lamp on the right, 270° at the top.
 */
export function lampVector(az: number, el: number): Vec3 {
  const t = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  return [Math.cos(e) * Math.cos(t), Math.cos(e) * Math.sin(t), Math.sin(e)];
}

/** Column to the right of `x`. Clamped edges return `x` itself, so hx = 0 on the last column. */
export function colRight(x: number, F: number, boundary: Boundary): number {
  return x + 1 < F ? x + 1 : boundary === "periodic" ? 0 : x;
}

/** Start index of the row below row `y`. Clamped edges return row `y`, so hy = 0 on the last row. */
export function rowBelow(y: number, F: number, boundary: Boundary): number {
  return y + 1 < F ? (y + 1) * F : boundary === "periodic" ? 0 : y * F;
}

/**
 * Lambert shading of every facet, from forward differences (docs/SOLVER.md §1):
 * s = max(u, 0) / q, with u = −Lx·hx − Ly·hy + Lz and q = √(1 + hx² + hy²).
 */
export function shadeField(
  h: FloatArray,
  F: number,
  L: Vec3,
  boundary: Boundary,
  out: FloatArray = new Float32Array(F * F),
): FloatArray {
  const [Lx, Ly, Lz] = L;
  for (let y = 0; y < F; y++) {
    const row = y * F;
    const down = rowBelow(y, F, boundary);
    for (let x = 0; x < F; x++) {
      const i = row + x;
      const h0 = h[i]!;
      const hx = h[row + colRight(x, F, boundary)]! - h0;
      const hy = h[down + x]! - h0;
      const u = -Lx * hx - Ly * hy + Lz;
      out[i] = u > 0 ? u / Math.sqrt(1 + hx * hx + hy * hy) : 0;
    }
  }
  return out;
}

/**
 * Sums the shading of each cell's C × C facets into `sums` (n × n). This is the solver's forward
 * pass, kept in the prototype's order of operations so the port reproduces it bit for bit.
 */
export function accumulateCellSums(
  h: FloatArray,
  n: number,
  C: number,
  L: Vec3,
  boundary: Boundary,
  sums: FloatArray,
): void {
  const F = n * C;
  const [Lx, Ly, Lz] = L;
  sums.fill(0);
  for (let y = 0; y < F; y++) {
    const row = y * F;
    const down = rowBelow(y, F, boundary);
    const cy = ((y / C) | 0) * n;
    for (let x = 0; x < F; x++) {
      const i = row + x;
      const h0 = h[i]!;
      const hx = h[row + colRight(x, F, boundary)]! - h0;
      const hy = h[down + x]! - h0;
      const u = -Lx * hx - Ly * hy + Lz;
      if (u > 0) sums[cy + ((x / C) | 0)]! += u / Math.sqrt(1 + hx * hx + hy * hy);
    }
  }
}

/** Mean shading per cell (n × n): what the eye sees from a step back. */
export function cellBrightness(
  h: FloatArray,
  n: number,
  C: number,
  L: Vec3,
  boundary: Boundary,
): Float64Array {
  const sums = new Float64Array(n * n);
  accumulateCellSums(h, n, C, L, boundary, sums);
  const inv = 1 / (C * C);
  return sums.map((s) => s * inv);
}
