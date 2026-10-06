import { describe, expect, it } from "vitest";
import { SAMPLE_LAYOUTS } from "../../src/core/layouts";
import { createSolver } from "../../src/core/solver";
import { prototypeSolve } from "./fixtures/prototype-solver.js";
import { bits, randomTargets } from "./helpers";

// With periodic edges the port must reproduce reference/prototype.html exactly: same initial
// field, same loss at every reported iteration, same heights bit for bit.
describe("parity with the prototype (periodic edges)", () => {
  const cases = [
    { name: "two lamps, n = 8", n: 8, iters: 40, az: SAMPLE_LAYOUTS.two.map((l) => l.az) },
    { name: "three lamps, n = 8", n: 8, iters: 40, az: SAMPLE_LAYOUTS.three.map((l) => l.az) },
    { name: "two lamps, full 384² grid", n: 96, iters: 5, az: SAMPLE_LAYOUTS.two.map((l) => l.az) },
  ];

  it.each(cases)("$name", ({ n, iters, az }) => {
    const C = 4;
    const seed = 7;
    const elev = 18;
    const targets = randomTargets(az.length, n, 99);
    const expected = prototypeSolve({
      targets: targets.map((t) => Array.from(t)),
      az,
      elev,
      n,
      C,
      iters,
      seed,
    });
    const solver = createSolver({
      n,
      C,
      lamps: az.map((a, k) => ({ az: a, el: elev, target: targets[k]! })),
      params: { boundary: "periodic", seed },
    });

    let compared = 0;
    for (let it = 1; it <= iters; it++) {
      const loss = solver.step();
      const snapshot = expected.find((s) => s.it === it);
      if (!snapshot) continue;
      expect(loss).toBe(snapshot.loss);
      expect(bits(solver.heights)).toEqual(bits(snapshot.h));
      compared++;
    }
    expect(compared).toBe(expected.length);
  });
});
