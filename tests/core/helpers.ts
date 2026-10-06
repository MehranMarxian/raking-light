import { mulberry32 } from "../../src/core/rng";

/** n × n targets with values uniform in [0, 1). */
export function randomTargets(count: number, n: number, seed: number): Float32Array[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => Float32Array.from({ length: n * n }, rng));
}

/** Binary n × n target: 1 inside a centred disc of radius n/3. */
export function discTarget(n: number): Float32Array {
  return Float32Array.from({ length: n * n }, (_, i) => {
    const dx = (i % n) + 0.5 - n / 2;
    const dy = Math.floor(i / n) + 0.5 - n / 2;
    return dx * dx + dy * dy < (n / 3) ** 2 ? 1 : 0;
  });
}

/** Binary n × n target: 1 on the left half. Uncorrelated with `discTarget` by symmetry. */
export function leftHalfTarget(n: number): Float32Array {
  return Float32Array.from({ length: n * n }, (_, i) => (i % n < n / 2 ? 1 : 0));
}

/** Pearson correlation. */
export function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
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
  return sab / Math.sqrt(saa * sbb);
}

export function standardDeviation(a: Float32Array | Float64Array): number {
  let mean = 0;
  for (const v of a) mean += v;
  mean /= a.length;
  let ss = 0;
  for (const v of a) ss += (v - mean) ** 2;
  return Math.sqrt(ss / a.length);
}

/** Bit pattern of a float32 field, for exact comparisons (distinguishes −0 and NaN payloads). */
export function bits(h: Float32Array): Uint32Array {
  return new Uint32Array(h.buffer, h.byteOffset, h.length);
}
