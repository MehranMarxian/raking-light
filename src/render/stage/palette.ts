/**
 * How shading becomes colour on the stage, from the prototype's renderer. Shared by the WebGL2
 * shader and the canvas fallback so both paint the same picture.
 */

export type RGB = readonly [number, number, number];

/** Plaster in full shadow, RGB 0–255. */
export const SHADOW: RGB = [17, 18, 23];

/** The prototype brightens shading slightly before mapping it to colour. */
export const GAIN = 1.12;

/** How much the lamp reads as low and raking: 0 at 60° and above, 1 at 10° and below. */
export function lowness(el: number): number {
  return Math.min(1, Math.max(0, (60 - el) / 50));
}

/** Lamp colour on plaster, RGB 0–255: neutral overhead, warmer tungsten as it drops. */
export function lampTint(el: number): RGB {
  const k = lowness(el);
  return [236 + 19 * k, 229 - 3 * k, 216 - 40 * k];
}

/** Strength of the brightness falloff across the disc, away from a low lamp. */
export function falloff(el: number): number {
  return 0.14 * lowness(el);
}
