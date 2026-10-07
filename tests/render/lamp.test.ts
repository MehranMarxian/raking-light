import { describe, expect, it } from "vitest";
import {
  azimuthOf,
  formatAz,
  keyStep,
  nearestLampIndex,
  normalizeAz,
  readLamp,
} from "../../src/render/stage/lamp";

describe("lamp geometry", () => {
  it("reads pointer directions in image coordinates: 0° right, 90° down, 270° up", () => {
    expect(azimuthOf(1, 0)).toBe(0);
    expect(azimuthOf(0, 1)).toBe(90);
    expect(azimuthOf(-1, 0)).toBe(180);
    expect(azimuthOf(0, -1)).toBe(270);
  });

  it("folds azimuths into [0, 360)", () => {
    expect(normalizeAz(-90)).toBe(270);
    expect(normalizeAz(360)).toBe(0);
    expect(normalizeAz(725)).toBe(5);
  });

  it("formats azimuths as three digits", () => {
    expect(formatAz(0)).toBe("000°");
    expect(formatAz(30)).toBe("030°");
    expect(formatAz(359.7)).toBe("000°");
  });
});

describe("readLamp", () => {
  const azimuths = [270, 0];

  it("finds a lamp within 14°", () => {
    expect(nearestLampIndex(280, azimuths)).toBe(0);
    expect(nearestLampIndex(350, azimuths)).toBe(1);
    expect(nearestLampIndex(315, azimuths)).toBeUndefined();
  });

  it("names flat light, a too-high lamp, a lamp, and the gaps between", () => {
    expect(readLamp(270, 90, azimuths)).toEqual({ kind: "flat" });
    expect(readLamp(270, 50, azimuths)).toEqual({ kind: "too-high" });
    expect(readLamp(5, 18, azimuths)).toEqual({ kind: "lamp", index: 1 });
    expect(readLamp(315, 18, azimuths)).toEqual({ kind: "between" });
  });
});

describe("keyStep", () => {
  it("turns 3° per arrow, 15° with Shift", () => {
    expect(keyStep("ArrowRight", false)).toBe(3);
    expect(keyStep("ArrowUp", true)).toBe(15);
    expect(keyStep("ArrowLeft", false)).toBe(-3);
    expect(keyStep("ArrowDown", true)).toBe(-15);
    expect(keyStep("Enter", false)).toBeNull();
  });
});
