import type { Boundary } from "./defaults";
import { cellBrightness, lampVector, type FloatArray } from "./shading";

export interface LampReport {
  /** Correlation between what the lamp shows and its own picture. */
  clarity: number;
  /**
   * For every lamp j, how strongly picture j shows under this lamp, relative to this lamp's own
   * picture. Its own entry is 1; a negative value is a negative ghost. NaN when the pictures are
   * too alike to tell apart.
   */
  ghosts: number[];
}

function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const len = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < len; i++) {
    ma += a[i]!;
    mb += b[i]!;
  }
  ma /= len;
  mb /= len;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < len; i++) {
    const da = a[i]! - ma;
    const db = b[i]! - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : NaN;
}

/** Solves the small square system A·x = b by Gaussian elimination; null if it is singular. */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const size = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < size; col++) {
    let pivot = col;
    for (let r = col + 1; r < size; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(M[pivot]![col]!) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot]!, M[col]!];
    for (let r = 0; r < size; r++) {
      if (r === col) continue;
      const f = M[r]![col]! / M[col]![col]!;
      for (let c = col; c <= size; c++) M[r]![c]! -= f * M[col]![c]!;
    }
  }
  return M.map((row, i) => row[size]! / row[i]!);
}

/**
 * For each lamp, fits what it shows (per-cell brightness) as a + Σ_j b_j · picture_j by least
 * squares. b_j / b_k says how much of picture j leaks in under lamp k: the ghost report the layout
 * editor shows after a preview solve.
 */
export function ghostReport(
  renders: readonly FloatArray[],
  targets: readonly Float32Array[],
): LampReport[] {
  const m = targets.length;
  const cells = targets[0]?.length ?? 0;
  // Normal equations for the predictors [1, t_0 … t_{m−1}], shared by every lamp.
  const predictors = (i: number, p: number) => (p === 0 ? 1 : targets[p - 1]![i]!);
  const XtX = Array.from({ length: m + 1 }, (_, p) =>
    Array.from({ length: m + 1 }, (_, q) => {
      let s = 0;
      for (let i = 0; i < cells; i++) s += predictors(i, p) * predictors(i, q);
      return s;
    }),
  );
  return renders.map((render, k) => {
    const Xty = Array.from({ length: m + 1 }, (_, p) => {
      let s = 0;
      for (let i = 0; i < cells; i++) s += predictors(i, p) * render[i]!;
      return s;
    });
    const coef = solveLinear(XtX, Xty);
    const own = coef?.[k + 1];
    const ghosts = targets.map((_, j) =>
      coef && own !== undefined && Math.abs(own) > 1e-9 ? coef[j + 1]! / own : NaN,
    );
    return { clarity: correlation(render, targets[k]!), ghosts };
  });
}

/** The ghost report for a solved field: what each lamp shows, fitted against all the pictures. */
export function reportForField(
  h: FloatArray,
  n: number,
  C: number,
  lamps: readonly { az: number; el: number; target: Float32Array }[],
  boundary: Boundary,
): LampReport[] {
  const renders = lamps.map((l) => cellBrightness(h, n, C, lampVector(l.az, l.el), boundary));
  return ghostReport(
    renders,
    lamps.map((l) => l.target),
  );
}
