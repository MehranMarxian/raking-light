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
