import { describe, expect, it } from "vitest";
import { SAMPLE_LAYOUTS } from "../../src/core/layouts";
import { plateSpecs } from "../../src/render/plates";

describe("plateSpecs", () => {
  it("shows overhead, each lamp, and the cross-fade between two lamps", () => {
    expect(plateSpecs(SAMPLE_LAYOUTS.two)).toEqual([
      { kind: "overhead", az: 45, el: 90 },
      { kind: "lamp", index: 0, az: 270, el: 18 },
      { kind: "lamp", index: 1, az: 0, el: 18 },
      { kind: "between", az: 315, el: 18 },
    ]);
  });

  it("shows overhead and each of three lamps", () => {
    const plates = plateSpecs(SAMPLE_LAYOUTS.three);
    expect(plates.map((p) => p.kind)).toEqual(["overhead", "lamp", "lamp", "lamp"]);
  });
});
