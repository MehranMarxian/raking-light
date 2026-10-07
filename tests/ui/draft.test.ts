import { describe, expect, it } from "vitest";
import { resolveParams } from "../../src/core/defaults";
import type { Project } from "../../src/core/project";
import { unusedSample, withAddedLamp, withLamp, withoutLamp } from "../../src/ui/editor/draft";

const target = new Float32Array(16);
const draft: Project = {
  n: 4,
  C: 4,
  params: resolveParams(),
  lamps: [
    { az: 270, el: 18, source: { kind: "sample", sample: 0 }, target },
    { az: 0, el: 18, source: { kind: "sample", sample: 2 }, target },
  ],
};
const sample1 = { source: { kind: "sample", sample: 1 } as const, target };

describe("draft edits", () => {
  it("changes one lamp and leaves the original alone", () => {
    const next = withLamp(draft, 1, { az: 45 });
    expect(next.lamps[1]!.az).toBe(45);
    expect(draft.lamps[1]!.az).toBe(0);
  });

  it("adds lamps in the widest gap, up to four", () => {
    const three = withAddedLamp(draft, sample1);
    expect(three.lamps[2]).toMatchObject({ az: 135, el: 18 });
    const four = withAddedLamp(three, sample1);
    expect(four.lamps).toHaveLength(4);
    expect(withAddedLamp(four, sample1)).toBe(four);
  });

  it("never drops below two lamps", () => {
    expect(withoutLamp(draft, 0)).toBe(draft);
    expect(withoutLamp(withAddedLamp(draft, sample1), 0).lamps.map((l) => l.az)).toEqual([0, 135]);
  });

  it("offers a sample no lamp shows yet", () => {
    expect(unusedSample(draft)).toBe(1);
  });
});
