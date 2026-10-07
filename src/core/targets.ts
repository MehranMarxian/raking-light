/**
 * Picture → cell target, as in the prototype. Decoding and resampling happen outside src/core
 * (canvas); these functions take the n × n pixels that come out of that.
 */

/** Largest centred square inside a w × h image: the crop applied before resampling to n × n. */
export function centerSquare(w: number, h: number): { sx: number; sy: number; size: number } {
  const size = Math.min(w, h);
  return { sx: (w - size) / 2, sy: (h - size) / 2, size };
}

/** Rec. 601 luma of `count` RGBA pixels, in [0, 1]. */
export function luminance(rgba: ArrayLike<number>, count: number): Float32Array {
  const t = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    t[i] = (0.299 * rgba[i * 4]! + 0.587 * rgba[i * 4 + 1]! + 0.114 * rgba[i * 4 + 2]!) / 255;
  }
  return t;
}

/**
 * Contrast shaping for photos: the `low` and `high` percentiles map to 0 and 1, clamped.
 * Photos need it; strong shapes and text do not (CLAUDE.md, key finding 5).
 */
export function levels(t: Float32Array, low = 0.02, high = 0.98): Float32Array {
  const sorted = Float32Array.from(t).sort();
  const lo = sorted[Math.floor(t.length * low)]!;
  const hi = sorted[Math.floor(t.length * high)]!;
  const span = Math.max(1e-3, hi - lo);
  return t.map((v) => Math.min(1, Math.max(0, (v - lo) / span)));
}

/** Fades a square n × n target to 0 outside its inscribed disc, over the outer tenth of the radius. */
export function discFade(t: Float32Array, n: number): Float32Array {
  return t.map((v, i) => {
    const dx = (i % n) + 0.5 - n / 2;
    const dy = Math.floor(i / n) + 0.5 - n / 2;
    const r = Math.sqrt(dx * dx + dy * dy) / (n / 2);
    return v * Math.min(1, Math.max(0, (0.98 - r) / 0.1));
  });
}

/** Targets hold 16-bit levels, k / 65535, so a project saved as 16-bit PNG loads back exactly. */
export const TARGET_LEVELS = 65535;

/** A target clamped to [0, 1] and rounded to 16-bit levels. Applying it twice changes nothing. */
export function canonicalTarget(t: Float32Array): Float32Array {
  return t.map((v) => Math.round(Math.min(1, Math.max(0, v)) * TARGET_LEVELS) / TARGET_LEVELS);
}

/** Halves an n × n target (n even) by averaging 2 × 2 blocks, for the quick preview solve. */
export function halveTarget(t: Float32Array, n: number): Float32Array {
  if (n % 2 !== 0) throw new Error(`Cannot halve a target of odd size ${String(n)}`);
  const m = n / 2;
  const out = new Float32Array(m * m);
  for (let y = 0; y < m; y++) {
    for (let x = 0; x < m; x++) {
      const i = 2 * y * n + 2 * x;
      out[y * m + x] = (t[i]! + t[i + 1]! + t[i + n]! + t[i + n + 1]!) / 4;
    }
  }
  return out;
}
