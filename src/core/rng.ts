/** A seeded source of floats in [0, 1). */
export type Rng = () => number;

/** mulberry32: a small, fast, seeded 32-bit PRNG, as in the prototype. */
export function mulberry32(seed: number): Rng {
  let st = seed >>> 0;
  return () => {
    st |= 0;
    st = (st + 0x6d2b79f5) | 0;
    let t = Math.imul(st ^ (st >>> 15), 1 | st);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A normal sample with standard deviation `sigma`: Box–Muller, cosine branch only, written exactly
 * as the prototype writes it (including the 6.2831853 constant and the multiplication order) so
 * seeded height fields match it bit for bit.
 */
export function gaussian(rng: Rng, sigma = 1): number {
  const u1 = rng() || 1e-9;
  const u2 = rng();
  return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(6.2831853 * u2);
}
