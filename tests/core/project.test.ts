import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "../../src/core/base64";
import { resolveParams } from "../../src/core/defaults";
import {
  ProjectError,
  parseProject,
  pngToTarget,
  serializeProject,
  targetToPng,
  type Project,
} from "../../src/core/project";
import { canonicalTarget } from "../../src/core/targets";
import { randomTargets } from "./helpers";

describe("base64", () => {
  it("round-trips every length and byte value", () => {
    for (let len = 0; len < 40; len++) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 97 + len * 13) % 256);
      expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
    }
  });

  it("matches the standard alphabet", () => {
    const ascii = (s: string) => Uint8Array.from(s, (ch) => ch.charCodeAt(0));
    expect(encodeBase64(ascii("Raking light"))).toBe("UmFraW5nIGxpZ2h0");
    expect(encodeBase64(Uint8Array.of(0xfb, 0xff))).toBe("+/8=");
  });

  it("rejects text that is not base64", () => {
    expect(() => decodeBase64("abc")).toThrow();
    expect(() => decodeBase64("ab!d")).toThrow();
  });
});

const n = 16;

function sampleProject(): Project {
  const [a, b, c] = randomTargets(3, n, 3).map(canonicalTarget);
  return {
    n,
    C: 4,
    params: resolveParams({ seed: 42 }),
    lamps: [
      { az: 270, el: 18, source: { kind: "sample", sample: 0 }, target: a! },
      { az: 0, el: 18, source: { kind: "image", name: "portrait.jpg" }, target: b! },
      {
        az: 135,
        el: 25,
        source: {
          kind: "text",
          spec: { text: "نور", family: "Vazirmatn", weight: 900, size: 0.85 },
        },
        target: c!,
      },
    ],
  };
}

describe("pictures as PNG", () => {
  it("round-trip a 16-bit target exactly", () => {
    const target = canonicalTarget(randomTargets(1, n, 9)[0]!);
    expect(pngToTarget(targetToPng(target, n), n)).toEqual(target);
  });

  it("refuses a picture of the wrong size", () => {
    const target = canonicalTarget(randomTargets(1, 8, 9)[0]!);
    expect(() => pngToTarget(targetToPng(target, 8), n)).toThrow(ProjectError);
  });
});

describe("project files", () => {
  it("load back exactly as saved", () => {
    const project = sampleProject();
    const loaded = parseProject(serializeProject(project));
    expect(loaded.n).toBe(n);
    expect(loaded.params).toEqual(project.params);
    loaded.lamps.forEach((lamp, i) => {
      const saved = project.lamps[i]!;
      expect(lamp.az).toBe(saved.az);
      expect(lamp.el).toBe(saved.el);
      expect(lamp.source).toEqual(saved.source);
      expect(lamp.target).toEqual(saved.target);
    });
  });

  const tamper = (edit: (json: Record<string, unknown>) => void) => {
    const json = JSON.parse(serializeProject(sampleProject())) as Record<string, unknown>;
    edit(json);
    return () => parseProject(JSON.stringify(json));
  };

  it("refuses files that are not projects", () => {
    expect(() => parseProject("not json")).toThrow(/not JSON/);
    expect(() => parseProject("{}")).toThrow(/not a Raking Light project/);
    expect(tamper((j) => (j.version = 2))).toThrow(/version 2/);
  });

  it("refuses layouts outside 2–4 lamps and out-of-range values", () => {
    expect(tamper((j) => (j.lamps = (j.lamps as unknown[]).slice(0, 1)))).toThrow(/2 to 4 lamps/);
    expect(
      tamper((j) => {
        (j.lamps as Record<string, unknown>[])[0]!.el = 95;
      }),
    ).toThrow(/elevation/);
    expect(
      tamper((j) => {
        (j.params as Record<string, unknown>).iterations = 1e6;
      }),
    ).toThrow(/Iterations/);
  });

  it("refuses unknown fonts and weights in text pictures", () => {
    const setSpec = (spec: Record<string, unknown>) =>
      tamper((j) => {
        const lamp = (j.lamps as Record<string, Record<string, unknown>>[])[2]!;
        lamp.source = { kind: "text", spec };
      });
    expect(setSpec({ text: "x", family: "Comic Sans", weight: 400, size: 1 })).toThrow(/font/);
    expect(setSpec({ text: "x", family: "Marcellus", weight: 900, size: 1 })).toThrow(/weight/);
  });
});
