# Raking Light
Open-source web app that solves **relief surfaces (height fields) that hide pictures**. Under flat light the surface reads as even, speckled noise. Under a low "raking" lamp from a specific direction, a specific picture rises out of the shadows. The result exports as a displacement map or a printable mesh, so it can be 3D-printed and cast in plaster.

Extension track: **Decoding Surfaces** — hiding text, codes or QR codes that only appear under a lighting "key".

Author: Mehran Ahmadi (designer/developer, photographer). License: MIT.
Owner's design philosophy: systems that withhold and reveal through use. Prefer bold, surprising choices over safe ones.

## Read first
- **[docs/SOLVER.md](docs/SOLVER.md)** — the math, the gradient, tuned parameters, and what the experiments showed. **Read before touching solver code.**
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — milestones and their definitions of done.
- `reference/prototype.html` (if present) — a working single-file prototype (solver in a Web Worker, 2D stage, plates, three.js medallion). It is the behavioral reference: the TS port must reproduce its results. Do not ship it; port from it.

## Stack (decided)
- **Vite + React + TypeScript (strict)**. State: Zustand. Worker RPC: Comlink.
- **Solver**: pure TypeScript in `src/core/`, run in a Web Worker. WebGPU compute version comes later (M6) behind the same interface.
- **Stage renderer**: WebGL2 fragment shader that shades the height field (height uploaded as an R32F texture, lamp as a uniform). The prototype's per-pixel canvas loop is only a reference.
- **3D preview**: three.js (flat-shaded mesh, directional lamp).
- **Exports**: 16-bit grayscale PNG (`fast-png`), binary STL and OBJ written by our own small writers in `src/core/export/`.
- **Tests**: Vitest. **Lint/format**: ESLint + Prettier.
- **Hosting**: static site on GitHub Pages, deployed by GitHub Actions. No backend. **Nothing the user uploads ever leaves the browser** — this is a stated product promise.

## Architecture
```
src/
  core/                 # pure TS, no DOM, no React — fully unit-tested
    solver.ts           # loss + analytic gradient + Adam step; deterministic given a seed
    shading.ts          # Lambert shading of a facet from forward differences
    layouts.ts          # lamp layouts (az/el per lamp, which target each lamp shows)
    targets.ts          # image -> cell target (crop, grayscale, levels, disc fade)
    rng.ts              # seeded PRNG (mulberry32) + gaussian
    export/png16.ts, stl.ts, obj.ts
  workers/solver.worker.ts   # wraps core/solver, streams progress (iteration, loss, height snapshot)
  render/
    stage/              # WebGL2 shading shader + lamp ring interaction
    medallion/          # three.js preview
  ui/                   # React components
  state/                # Zustand store
tests/                  # Vitest, mirrors src/core
reference/              # prototype.html (not bundled)
```
Rules:
- `src/core` must stay framework-free and DOM-free so it runs in workers, tests and (later) Node CLI.
- Height fields are `Float32Array`, row-major, `F × F`. Units: one height unit = one facet pitch (true scale). Keep this convention everywhere; convert to millimetres only at export.
- Transfer large arrays between worker and main thread as transferables, not copies.

## Solver at a glance (details in [docs/SOLVER.md](docs/SOLVER.md))
- Targets: `n × n` cells (default 96). Each cell is backed by `C × C` heights (default 4) → grid `F = n·C = 384`.
- Each facet is shaded with Lambert from forward differences; brightness is averaged per cell (what the eye sees from a step back).
- Loss = Σ over lamps of (cell brightness − mapped target)² + `wFlat` × (overhead cell brightness − 0.6)². The flat term is what makes the surface read as noise under normal light.
- Adam, lr 0.05, 300 iterations, init N(0, 0.6) with fixed seed.
- Measured: 384² grid solves in 5–8 s in a desktop browser, relief depth ≈ 3.1 mm on a 120 mm disc.

## Key findings to respect
1. **Two lamps 90° apart separate almost perfectly.** Three lamps at 120° leave faint *negative* ghosts, because in the small-slope regime the three directional derivatives sum to ~zero (bright for one lamp ⇒ dark for the others). Opposite lamps (180°) are near-inverses of each other — never offer that layout without warning.
2. Under raking light the darkest achievable background is about `sin(elevation)`; asking for darker wastes the optimizer's effort. Target mapping `lo = 0.1, hi = 0.85` works well at 18°.
3. Pictures cross-fade over roughly ±25° of lamp azimuth. That is the "key tolerance" for Decoding Surfaces.
4. The prototype uses **periodic (wrap-around) boundaries**. That is wrong for physical export — switch to clamped/Neumann boundaries in the TS port and confirm results match.
5. Strong shapes and text survive best. Photos need contrast shaping (levels to 2nd–98th percentile).

## Visual identity (from the prototype)
- Dark "gallery" look: basalt ground `#16171b`, bench `#1e2025`, hairline `#33353c`, plaster `#ebe5d9`, caption grey `#9c988f`, tungsten lamp accent `#ffb75e`.
- Type: Marcellus (display, inscriptional), Hanken Grotesk (body), IBM Plex Mono (readouts, captions in museum-plate style: `AZ 270° · EL 18°`), Vazirmatn 900 for Persian text targets.
- The stage is a round medallion inside a goniometer ring with degree ticks; the lamp is a glowing dot on the ring.

## Working conventions
- Owner works on **Windows with PowerShell**. Scripts in `package.json` must be cross-platform (no bash-only syntax; use `rimraf`, `cross-env` if needed).
- Node 22 LTS. Package manager: npm.
- Every change to `src/core` comes with tests. Solver changes must keep the gradient check passing (see [docs/SOLVER.md §8 Testing](docs/SOLVER.md#8-testing)).
- Small, focused commits with clear messages. Commits are co-authored with Claude.
- Before saying a milestone is done, run `npm run build`, `npm test`, and open the app.
- Ask before adding a dependency that is not listed above.

## Not doing (for now)
- No accounts, no server, no analytics.
- No marketing it as an anti-counterfeiting or security product: a relief can be copied by casting it. Decoding Surfaces is presented as art and concealment, not security.
