import { DEFAULTS, resolveParams } from "../core/defaults";
import { SAMPLE_LAYOUTS, type SampleLayoutId } from "../core/layouts";
import type { Project } from "../core/project";
import { canonicalTarget } from "../core/targets";
import { DESIGN, canvasToTarget, context2d, makeCanvas, waitForFont } from "./pictures";

/**
 * The prototype's sample pictures, drawn on a canvas and reduced to n × n cell targets, in the
 * order of SAMPLE_PICTURES: crescent with stars, khatam star, and نور ("light") in Vazirmatn 900.
 */

const PERSIAN = '900 150px "Vazirmatn", "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif';

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
  const cv = makeCanvas(DESIGN);
  const g = context2d(cv);
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

async function drawSamples(n: number): Promise<Float32Array[]> {
  await waitForFont('900 150px "Vazirmatn"', "نور");
  return [0, 1, 2].map((k) => canonicalTarget(canvasToTarget(drawSample(k), n)));
}

const cache = new Map<number, Promise<Float32Array[]>>();

/** The three sample pictures as n × n targets, drawn once Vazirmatn has loaded (or 2.5 s passed). */
export function loadSampleTargets(n: number): Promise<Float32Array[]> {
  let targets = cache.get(n);
  if (!targets) {
    targets = drawSamples(n);
    cache.set(n, targets);
  }
  return targets;
}

/** One of the prototype's sample layouts as a project: two lamps (crescent + نور) or three. */
export async function samplePreset(id: SampleLayoutId, n: number = DEFAULTS.n): Promise<Project> {
  const targets = await loadSampleTargets(n);
  return {
    n,
    C: DEFAULTS.C,
    params: resolveParams(),
    lamps: SAMPLE_LAYOUTS[id].map(({ picture, az, el }) => ({
      az,
      el,
      source: { kind: "sample", sample: picture },
      target: targets[picture]!,
    })),
  };
}
