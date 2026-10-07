import type { TextSpec } from "../core/project";
import { canonicalTarget, centerSquare, discFade, levels, luminance } from "../core/targets";

/**
 * Pictures become n × n cell targets here, on a canvas: uploaded images and typed text. Nothing
 * leaves the browser; files are decoded locally.
 */

/** Pictures are drawn on a square this size, as in the prototype (96 cells × 4), then resampled. */
export const DESIGN = 384;

export class PictureError extends Error {
  override name = "PictureError";
}

export function makeCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

export function context2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("Canvas 2D is not available");
  return g;
}

/** Resamples a drawn picture to n × n and reads its brightness. */
export function canvasToTarget(source: CanvasImageSource, n: number): Float32Array {
  const out = makeCanvas(n);
  const g = context2d(out);
  g.imageSmoothingQuality = "high";
  g.drawImage(source, 0, 0, n, n);
  return luminance(g.getImageData(0, 0, n, n).data, n * n);
}

/** Waits for a font to load, or 2.5 s; a canvas draws with a fallback until then. */
export async function waitForFont(font: string, text: string): Promise<void> {
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  try {
    await Promise.race([document.fonts.load(font, text), timeout]);
  } catch {
    // Draw with a fallback font.
  }
}

/**
 * An uploaded image as a target, as the prototype treats photos: the centred square, grayscale,
 * levels stretched to the 2nd–98th percentile, and faded to black outside the disc.
 */
export async function imageToTarget(file: Blob, n: number): Promise<Float32Array> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PictureError("That file couldn't be read as an image. Try a JPEG or PNG.");
  }
  const { sx, sy, size } = centerSquare(bitmap.width, bitmap.height);
  const out = makeCanvas(n);
  const g = context2d(out);
  g.imageSmoothingQuality = "high";
  g.drawImage(bitmap, sx, sy, size, size, 0, 0, n, n);
  bitmap.close();
  const t = luminance(g.getImageData(0, 0, n, n).data, n * n);
  return canonicalTarget(discFade(levels(t), n));
}

/** Hebrew and Arabic-script letters, which run right to left. */
const RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function isRightToLeft(text: string): boolean {
  return RTL.test(text);
}

/** Text fits inside this share of the square, about the square inscribed in the disc. */
const FIT = 0.72;
const LINE_HEIGHT = 1.15;

/** Typed text as a target: white on black, centred, scaled so the largest size fits the disc. */
export async function textToTarget(spec: TextSpec, n: number): Promise<Float32Array> {
  const lines = spec.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const family = `"${spec.family}", sans-serif`;
  await waitForFont(`${String(spec.weight)} 100px "${spec.family}"`, spec.text || "A");

  const cv = makeCanvas(DESIGN);
  const g = context2d(cv);
  g.fillStyle = "#000";
  g.fillRect(0, 0, DESIGN, DESIGN);
  if (lines.length > 0) {
    g.font = `${String(spec.weight)} 100px ${family}`;
    const widest = Math.max(...lines.map((line) => g.measureText(line).width), 1);
    const fitWidth = ((FIT * DESIGN) / widest) * 100;
    const fitHeight = (FIT * DESIGN) / (lines.length * LINE_HEIGHT);
    const px = Math.min(fitWidth, fitHeight) * spec.size;
    g.font = `${String(spec.weight)} ${String(px)}px ${family}`;
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.direction = isRightToLeft(spec.text) ? "rtl" : "ltr";
    const top = DESIGN / 2 - ((lines.length - 1) * px * LINE_HEIGHT) / 2;
    lines.forEach((line, i) => {
      g.fillText(line, DESIGN / 2, top + i * px * LINE_HEIGHT);
    });
  }
  return canonicalTarget(canvasToTarget(cv, n));
}
