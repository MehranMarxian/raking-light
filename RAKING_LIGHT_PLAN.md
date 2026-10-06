# Raking Light · Project Plan

This one file is the full brief for building Raking Light as an open-source web app with Claude Code. Part 1 becomes the project's `CLAUDE.md`, Part 2 the roadmap, Part 3 the solver notes.

---

# Part 1 · Project brief (becomes CLAUDE.md)
Open-source web app that solves **relief surfaces (height fields) that hide pictures**. Under flat light the surface reads as even, speckled noise. Under a low "raking" lamp from a specific direction, a specific picture rises out of the shadows. The result exports as a displacement map or a printable mesh, so it can be 3D-printed and cast in plaster.

Extension track: **Decoding Surfaces** — hiding text, codes or QR codes that only appear under a lighting "key".

Author: Mehran Ahmadi (designer/developer, photographer). License: MIT.
Owner's design philosophy: systems that withhold and reveal through use. Prefer bold, surprising choices over safe ones.

## Read first
- **Part 3 · Solver** below — the math, the gradient, tuned parameters, and what the experiments showed. **Read before touching solver code.**
- **Part 2 · Roadmap** below — milestones and their definitions of done.
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

## Solver at a glance (details in Part 3)
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
- Every change to `src/core` comes with tests. Solver changes must keep the gradient check passing (see Part 3 §8 Testing).
- Small, focused commits with clear messages. Commits are co-authored with Claude.
- Before saying a milestone is done, run `npm run build`, `npm test`, and open the app.
- Ask before adding a dependency that is not listed above.

## Not doing (for now)
- No accounts, no server, no analytics.
- No marketing it as an anti-counterfeiting or security product: a relief can be copied by casting it. Decoding Surfaces is presented as art and concealment, not security.

---

# Part 2 · Roadmap (becomes docs/ROADMAP.md)

Each milestone ends with: `npm run build` passes, `npm test` passes, the app runs, and a short note in `CHANGELOG.md`.

### M0 · Scaffold (day 1)
- Vite + React + TypeScript (strict), Zustand, Comlink, Vitest, ESLint + Prettier.
- Folder layout from the Architecture section. `src/core` empty but wired to tests.
- GitHub Actions: CI (lint, test, build) on every push; deploy to GitHub Pages on `main`.
- `LICENSE` (MIT, Mehran Ahmadi, 2026), `README.md` stub, `.gitignore`, `CHANGELOG.md`.
- App shell with the visual identity (fonts, tokens, dark gallery look) and an empty round stage.
**Done when** the deployed Pages URL shows the shell.

### M1 · Solver core
- Port the solver from `reference/prototype.html` to `src/core/solver.ts` (+ `shading.ts`, `rng.ts`, `targets.ts`, `layouts.ts`).
- Switch to clamped boundaries; confirm results still match the reference visually.
- Worker wrapper streaming progress (iteration, loss, height snapshot every 5 iterations, transferables).
- All tests from the Testing section, especially the gradient check.
**Done when** the 2-lamp sample (crescent + نور) solves in under 8 s and the tests pass.

### M2 · Stage
- WebGL2 shading shader for the height field; lamp ring with drag, keyboard control, lamp-height slider, flat-light button, auto-sweep that dwells on each lamp.
- Live update while solving; loss chart; documentation plates (overhead + one per lamp).
- Two / three picture modes with the sample targets.
**Done when** it matches the prototype's look and runs at 60 fps while dragging on a laptop.

### M3 · Targets and layouts
- Upload pictures per lamp (crop, levels, disc fade), drag-and-drop.
- Text-to-target: type a message, pick a font (Latin + Persian via Vazirmatn), size, weight.
- Lamp layout editor: 2–4 lamps, azimuth and elevation per lamp, warnings for opposite or crowded lamps, quick low-res preview solve (n = 48) while editing.
- Save / load a project as a JSON file (targets as PNG data, layout, params, seed).

### M4 · Export and the physical object
- Export 16-bit displacement PNG, binary STL with a base and mm scale, OBJ.
- Physical panel: diameter or width in mm, base thickness, depth readout, slope limit.
- three.js medallion preview with an orbiting lamp.
- **Make one real test print** (resin, then plaster cast) and photograph it under a lamp. Record what the material changes (contrast, tolerance) in `docs/PHYSICAL.md`.

### M5 · Decoding Surfaces
- Single-key message mode.
- Decoy + secret mode (decoy under normal light).
- Two-color combination lock (red + cyan lamps, visual-cryptography split), with stage support for colored lamps.
- QR code target (level H) with a "scan test" in the stage view.

### M6 · Scale and fidelity
- WebGPU compute solver behind the same interface, CPU fallback. Target: 1024² grid.
- Cast shadows in the renderer, then in the solver (research).
- Slope-limit penalty for printability.

### M7 · v0.1 public release
- README with GIFs of pictures emerging, a hosted demo, three example projects, a "how it works" page adapted from the solver notes.
- Open the repo for issues; tag v0.1.0.

---

# Part 3 · Solver (becomes docs/SOLVER.md)

How Raking Light turns a set of pictures into one height field. Everything here was verified in `reference/prototype.html` on 2026-10-07.

### 1. Model

**Grid.** `n × n` picture cells (default `n = 96`). Each cell is a `C × C` patch of heights (default `C = 4`). The height field `h` has `F = n·C` samples per side (384). Height unit = facet pitch, so slopes are true slopes.

**Facet normal.** Forward differences:

```
hx = h[y][x+1] − h[y][x]
hy = h[y+1][x] − h[y][x]
q  = sqrt(1 + hx² + hy²)
n  = (−hx, −hy, 1) / q
```

**Lamp.** Azimuth θ (image coordinates, y points down, 0° = lamp on the right, 270° = top), elevation e:

```
L = (cos e · cos θ,  cos e · sin θ,  sin e)
```

**Shading.** Lambert with attached shadows (no cast shadows yet):

```
u = −Lx·hx − Ly·hy + Lz
s = max(u, 0) / q
```

**Cell brightness.** Mean of `s` over the cell's `C × C` facets. This models the eye averaging tiny facets from viewing distance, and it is the extra freedom that lets one surface serve several lamps: inside a cell, some facets face lamp A, some face lamp B.

### 2. Loss

For each lamp `k` with target picture `T_k ∈ [0,1]` (per cell):

```
target_k = lo + (hi − lo) · T_k            # lo = 0.10, hi = 0.85
L_k      = mean over cells (cellmean(s_k) − target_k)²
```

Flat-light term (lamp straight overhead, L = (0,0,1)):

```
L_flat = wFlat · mean over cells (cellmean(s_flat) − 0.6)²     # wFlat = 4
```

Total: `L = Σ_k L_k + L_flat`, plus a tiny Tikhonov term `1e−7 · h` in the gradient to keep the null space from drifting.

The flat term is the "reads as noise" property. Without it, the silhouettes of all pictures show under normal light as patches of rougher texture.

### 3. Gradient

For a facet with `u > 0` (lit):

```
∂s/∂hx = −Lx/q − u·hx/q³
∂s/∂hy = −Ly/q − u·hy/q³
```

For an unlit facet the gradient is 0. With `r_cell = cellmean(s) − target` and `d = 2 · w · r_cell / (C² · cells)`:

```
g[x+1] += d·∂s/∂hx      g[x] −= d·∂s/∂hx
g[y+1] += d·∂s/∂hy      g[y] −= d·∂s/∂hy
```

### 4. Optimizer

Adam, `lr = 0.05`, `β1 = 0.9`, `β2 = 0.999`, `ε = 1e−12`, 300 iterations. Initialize `h ~ N(0, 0.6)` from a seeded PRNG (mulberry32, seed 7 in the prototype) so results are reproducible. Stream a height snapshot to the UI every 5 iterations so the user watches the pictures emerge.

Cost per iteration: two passes over `F²` facets per lamp (forward, then gradient). 384², 2 lamps + flat: about 15–25 ms in JS.

### 5. Tuned defaults

| Parameter | Value | Note |
|---|---|---|
| n, C, F | 96, 4, 384 | 147,456 heights |
| Solve elevation | 18° | lower = crisper pictures, narrower key |
| lo / hi | 0.10 / 0.85 | background can't go much below sin(e) ≈ 0.31 anyway |
| Flat target / weight | 0.6 / 4 | |
| Adam lr / iterations | 0.05 / 300 | loss mostly flat after ~150 |
| Init σ | 0.6 | texture everywhere from the start |

### 6. Findings

- **2 lamps at 90° apart:** clean separation, final loss ≈ 0.02–0.025.
- **3 lamps at 120°:** visible negative ghosts, final loss ≈ 0.03–0.06. Reason: for small slopes, `s_k ≈ sin e − cos e · D_θk h`, and `D_0 + D_120 + D_240 = 0`. The clamp `max(u,0)` is the only thing breaking that constraint.
- **Opposite lamps (θ and θ+180°):** near-inverse pictures. Warn in the layout editor.
- **Key tolerance:** pictures cross-fade over about ±25° of azimuth.
- **Physical scale:** on a 120 mm disc (pitch 0.3125 mm), peak-to-valley depth ≈ 3.1–3.4 mm.
- **Boundaries:** the prototype wraps around (periodic). Use clamped boundaries for export.

### 7. Decoding Surfaces modes (M5)

**Single key.** Text rendered to a target, assigned to one lamp. Weakest lock: a flashlight sweep finds it.

**Decoy + secret.** Replace the flat-light term's constant 0.6 with a decoy picture (mapped to a narrow range, e.g. 0.5–0.7). Normal room light shows the decoy; the raking key shows the secret.

**Two-color combination lock.** Two lamps 90° apart, one red, one cyan, both on together. Per cell, draw a random bit `N`:
- red lamp target  = `N` (bright or dark at random)
- cyan lamp target = `N` inside the message, `1 − N` outside it

Each lamp alone shows independent random speckle, with no information about the message (same principle as visual cryptography). With both lamps on, cells inside the letters are neutral (both dark or both bright) and cells outside are strongly red or cyan, so the text appears as neutral letters on colored confetti. Rendering needs per-lamp color, which the stage shader already supports by summing lamps.

**QR targets.** A version 1 QR code (21 × 21 modules) fits the 96-cell grid at about 4 cells per module. Use error correction level H to absorb ghosting.

### 8. Testing

Must-have tests in `tests/core/`:

1. **Gradient check.** On a 16×16 grid (n = 4, C = 4) with random h, compare the analytic gradient to central finite differences (step 1e−4, float64) for 20 random indices. Relative error < 1e−3. Skip facets near `u = 0` (non-differentiable).
2. **Loss decreases.** 50 iterations on a small target reduce the loss by at least 50 %.
3. **Determinism.** Same seed and inputs → bit-identical height field.
4. **Flat-light uniformity.** After solving, the std of overhead cell brightness is below a threshold (calibrate from the reference).
5. **Two-lamp separation.** After solving two binary targets, correlation between the lamp-A render and target A is > 0.8, and with target B is < 0.2.
6. **Exports.** STL triangle count and bounding box match the grid and mm scale; the 16-bit PNG round-trips through `fast-png` within ±1 level.

### 9. Open research
- Cast shadows (ray-march along the lamp direction) for keys narrower than ±25°.
- Point lights at a known distance as a "keyhole" key.
- WebGPU compute for 1024² grids.
- Slope limits for printability (penalty on |∇h| above a threshold).
