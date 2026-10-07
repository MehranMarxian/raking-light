import { describe, expect, it } from "vitest";
import { DWELL_MS, MOVE_MS, sweepAngle, sweepStartTime } from "../../src/render/stage/sweep";

const two = [270, 0];

describe("sweepAngle", () => {
  it("rests on each lamp before moving", () => {
    expect(sweepAngle(0, two)).toBe(270);
    expect(sweepAngle(DWELL_MS - 1, two)).toBe(270);
    expect(sweepAngle(sweepStartTime(1), two)).toBe(0);
  });

  it("glides clockwise, passing the midpoint halfway through the move", () => {
    expect(sweepAngle(DWELL_MS + MOVE_MS / 2, two)).toBeCloseTo(315, 9);
    // From 0° back to 270° it keeps turning clockwise, the long way through 135°.
    expect(sweepAngle(sweepStartTime(1) + DWELL_MS + MOVE_MS / 2, two)).toBeCloseTo(135, 9);
  });

  it("eases in and out", () => {
    const early = sweepAngle(DWELL_MS + MOVE_MS * 0.1, two) - 270;
    const middle =
      sweepAngle(DWELL_MS + MOVE_MS * 0.5, two) - sweepAngle(DWELL_MS + MOVE_MS * 0.4, two);
    expect(early).toBeLessThan(middle);
  });

  it("loops back to the first lamp", () => {
    expect(sweepAngle(sweepStartTime(2), two)).toBe(270);
    expect(sweepAngle(sweepStartTime(3), [270, 30, 150])).toBe(270);
  });

  it("stays in [0, 360)", () => {
    for (let t = 0; t < sweepStartTime(4); t += 37) {
      const az = sweepAngle(t, [270, 30, 150]);
      expect(az).toBeGreaterThanOrEqual(0);
      expect(az).toBeLessThan(360);
    }
  });
});
