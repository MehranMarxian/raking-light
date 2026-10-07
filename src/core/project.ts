import { decode, encode } from "fast-png";
import { decodeBase64, encodeBase64 } from "./base64";
import { resolveParams, type Boundary, type SolverParams } from "./defaults";
import { MAX_LAMPS, MIN_LAMPS } from "./layouts";
import { TARGET_LEVELS, canonicalTarget } from "./targets";

/**
 * A Raking Light project: the lamps, the picture each one shows, and the solver settings. Saved
 * as JSON with every picture as a 16-bit grayscale PNG data URL, so it loads back exactly and the
 * same project always solves to the same surface.
 */

export const PROJECT_FORMAT = "raking-light-project";
export const PROJECT_VERSION = 1;

/** Fonts a text picture may use, with the weights the app loads for each. */
export const TEXT_FONTS = {
  Marcellus: [400],
  "Hanken Grotesk": [400, 700, 900],
  "IBM Plex Mono": [400, 700],
  Vazirmatn: [400, 700, 900],
} as const satisfies Record<string, readonly number[]>;

export type TextFamily = keyof typeof TEXT_FONTS;

export interface TextSpec {
  text: string;
  family: TextFamily;
  weight: number;
  /** 1 = as large as fits inside the disc. */
  size: number;
}

export const MAX_TEXT_LENGTH = 200;

/** Where a lamp's picture came from, kept so it can be shown and (for text) edited again. */
export type PictureSource =
  | { kind: "sample"; sample: number }
  | { kind: "image"; name: string }
  | { kind: "text"; spec: TextSpec };

export interface ProjectLamp {
  az: number;
  el: number;
  source: PictureSource;
  /** n × n, values on 16-bit levels (see canonicalTarget). */
  target: Float32Array;
}

export interface Project {
  n: number;
  C: number;
  params: SolverParams;
  lamps: ProjectLamp[];
}

export class ProjectError extends Error {
  override name = "ProjectError";
}

const PNG_PREFIX = "data:image/png;base64,";

/** A target as a 16-bit grayscale PNG data URL. */
export function targetToPng(target: Float32Array, n: number): string {
  const data = Uint16Array.from(target, (v) =>
    Math.round(Math.min(1, Math.max(0, v)) * TARGET_LEVELS),
  );
  return PNG_PREFIX + encodeBase64(encode({ width: n, height: n, data, depth: 16, channels: 1 }));
}

/** A PNG data URL as an n × n target. Colour PNGs are read as luma. */
export function pngToTarget(url: string, n: number): Float32Array {
  if (!url.startsWith(PNG_PREFIX)) throw new ProjectError("A picture is not a PNG data URL.");
  let png;
  try {
    png = decode(decodeBase64(url.slice(PNG_PREFIX.length)));
  } catch {
    throw new ProjectError("A picture could not be decoded as PNG.");
  }
  if (png.width !== n || png.height !== n) {
    throw new ProjectError(
      `A picture is ${String(png.width)} × ${String(png.height)}; expected ${String(n)} × ${String(n)}.`,
    );
  }
  if (png.palette) throw new ProjectError("Indexed-colour pictures are not supported.");
  const max = 2 ** png.depth - 1;
  const { channels, data } = png;
  const t = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const p = i * channels;
    t[i] =
      channels >= 3
        ? (0.299 * data[p]! + 0.587 * data[p + 1]! + 0.114 * data[p + 2]!) / max
        : data[p]! / max;
  }
  return canonicalTarget(t);
}

export function serializeProject(project: Project): string {
  const { n, C, params, lamps } = project;
  return JSON.stringify(
    {
      format: PROJECT_FORMAT,
      version: PROJECT_VERSION,
      n,
      C,
      params,
      lamps: lamps.map(({ az, el, source, target }) => ({
        az,
        el,
        source,
        picture: targetToPng(target, n),
      })),
    },
    null,
    2,
  );
}

// ---- Reading a project file: trust nothing in it. ----

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function num(v: unknown, what: string, min: number, max: number, integer = false): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    throw new ProjectError(`${what} must be a number from ${String(min)} to ${String(max)}.`);
  }
  if (integer && !Number.isInteger(v)) throw new ProjectError(`${what} must be a whole number.`);
  return v;
}

function readSource(v: unknown, where: string): PictureSource {
  if (!isObject(v)) throw new ProjectError(`${where}: missing picture source.`);
  switch (v.kind) {
    case "sample":
      return { kind: "sample", sample: num(v.sample, `${where} sample`, 0, 2, true) };
    case "image":
      if (typeof v.name !== "string") throw new ProjectError(`${where}: image name missing.`);
      return { kind: "image", name: v.name.slice(0, 200) };
    case "text": {
      const spec = v.spec;
      if (!isObject(spec) || typeof spec.text !== "string") {
        throw new ProjectError(`${where}: text settings missing.`);
      }
      if (spec.text.length > MAX_TEXT_LENGTH) throw new ProjectError(`${where}: text too long.`);
      const family = spec.family;
      if (typeof family !== "string" || !(family in TEXT_FONTS)) {
        throw new ProjectError(`${where}: unknown font.`);
      }
      const weights: readonly number[] = TEXT_FONTS[family as TextFamily];
      const weight = num(spec.weight, `${where} weight`, 100, 900, true);
      if (!weights.includes(weight)) throw new ProjectError(`${where}: unsupported weight.`);
      return {
        kind: "text",
        spec: {
          text: spec.text,
          family: family as TextFamily,
          weight,
          size: num(spec.size, `${where} size`, 0.1, 1),
        },
      };
    }
    default:
      throw new ProjectError(`${where}: unknown picture source.`);
  }
}

function readParams(v: unknown): SolverParams {
  if (!isObject(v)) throw new ProjectError("Solver settings missing.");
  const boundary = v.boundary;
  if (boundary !== "clamped" && boundary !== "periodic") {
    throw new ProjectError("Edge mode must be clamped or periodic.");
  }
  return resolveParams({
    lo: num(v.lo, "lo", 0, 1),
    hi: num(v.hi, "hi", 0, 1),
    flatTarget: num(v.flatTarget, "Flat target", 0, 1),
    wFlat: num(v.wFlat, "Flat weight", 0, 100),
    lr: num(v.lr, "Learning rate", 1e-6, 1),
    iterations: num(v.iterations, "Iterations", 1, 5000, true),
    initSigma: num(v.initSigma, "Initial sigma", 0, 10),
    seed: num(v.seed, "Seed", 0, 2 ** 32 - 1, true),
    boundary: boundary satisfies Boundary,
  });
}

/** Reads a project file. Throws ProjectError with a sentence a person can act on. */
export function parseProject(text: string): Project {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ProjectError("This file is not JSON.");
  }
  if (!isObject(json) || json.format !== PROJECT_FORMAT) {
    throw new ProjectError("This is not a Raking Light project file.");
  }
  if (json.version !== PROJECT_VERSION) {
    throw new ProjectError(`Project version ${String(json.version)} is not supported.`);
  }
  const n = num(json.n, "Cells per side", 8, 192, true);
  if (n % 2 !== 0) throw new ProjectError("Cells per side must be even.");
  const C = num(json.C, "Heights per cell", 1, 8, true);
  const params = readParams(json.params);
  const lamps = json.lamps;
  if (!Array.isArray(lamps) || lamps.length < MIN_LAMPS || lamps.length > MAX_LAMPS) {
    throw new ProjectError(`A project needs ${String(MIN_LAMPS)} to ${String(MAX_LAMPS)} lamps.`);
  }
  return {
    n,
    C,
    params,
    lamps: lamps.map((lamp: unknown, i) => {
      const where = `Lamp ${String(i + 1)}`;
      if (!isObject(lamp)) throw new ProjectError(`${where} is not readable.`);
      if (typeof lamp.picture !== "string") throw new ProjectError(`${where}: picture missing.`);
      return {
        az: ((num(lamp.az, `${where} azimuth`, -360, 720) % 360) + 360) % 360,
        el: num(lamp.el, `${where} elevation`, 1, 90),
        source: readSource(lamp.source, where),
        target: pngToTarget(lamp.picture, n),
      };
    }),
  };
}
