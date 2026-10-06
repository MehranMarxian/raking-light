import { luminance } from "../core/targets";

/**
 * The prototype's sample pictures, drawn on a canvas and reduced to n × n cell targets, in the
 * order of SAMPLE_PICTURES: crescent with stars, khatam star, and نور ("light") in Vazirmatn 900.
 */

/** Pictures are drawn on a square this size, as in the prototype (96 cells × 4), then resampled. */
const DESIGN = 384;
const PERSIAN = '900 150px "Vazirmatn", "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif';

function canvas(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("Canvas 2D is not available");
  return g;
}

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  g.closePath();
  g.fill();
}

function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function drawSample(k: number): HTMLCanvasElement {
  const cv = canvas(DESIGN);
  const g = context(cv);
  const c = DESIGN / 2;
  g.fillStyle = "#000";
  g.fillRect(0, 0, DESIGN, DESIGN);
  g.fillStyle = "#fff";
  if (k === 0) {
    disc(g, c - 18, c + 4, 118);
    g.globalCompositeOperation = "destination-out";
    disc(g, c + 26, c - 30, 104);
    g.globalCompositeOperation = "source-over";
    star(g, c + 92, c - 62, 26);
    star(g, c + 120, c + 30, 17);
    star(g, c + 58, c + 108, 20);
    star(g, c - 4, c - 128, 13);
  } else if (k === 1) {
    const square = (rot: number, r: number) => {
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = rot + (i * Math.PI) / 2;
        g.lineTo(c + r * Math.cos(a), c + r * Math.sin(a));
      }
      g.closePath();
      g.fill();
    };
    square(0, 150);
    square(Math.PI / 4, 150);
    g.fillStyle = "#000";
    disc(g, c, c, 74);
    g.fillStyle = "#fff";
    disc(g, c, c, 46);
    g.fillStyle = "#000";
    disc(g, c, c, 18);
  } else {
    g.font = PERSIAN;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.direction = "rtl";
    g.fillText("نور", c, c + 6);
  }
  return cv;
}

function toTarget(source: HTMLCanvasElement, n: number): Float32Array {
  const out = canvas(n);
  const g = context(out);
  g.imageSmoothingQuality = "high";
  g.drawImage(source, 0, 0, n, n);
  return luminance(g.getImageData(0, 0, n, n).data, n * n);
}

/** Draws the three sample pictures as n × n targets, once Vazirmatn has loaded (or 2.5 s passed). */
export async function loadSampleTargets(n: number): Promise<Float32Array[]> {
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  try {
    await Promise.race([document.fonts.load('900 150px "Vazirmatn"', "نور"), timeout]);
  } catch {
    // Draw with a fallback font.
  }
  return [0, 1, 2].map((k) => toTarget(drawSample(k), n));
}
