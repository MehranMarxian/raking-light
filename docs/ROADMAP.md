# Raking Light · Roadmap

Each milestone ends with: `npm run build` passes, `npm test` passes, the app runs, and a short note in `CHANGELOG.md`.

## M0 · Scaffold (day 1)
- Vite + React + TypeScript (strict), Zustand, Comlink, Vitest, ESLint + Prettier.
- Folder layout from the Architecture section of [CLAUDE.md](../CLAUDE.md#architecture). `src/core` empty but wired to tests.
- GitHub Actions: CI (lint, test, build) on every push; deploy to GitHub Pages on `main`.
- `LICENSE` (MIT, Mehran Ahmadi, 2026), `README.md` stub, `.gitignore`, `CHANGELOG.md`.
- App shell with the [visual identity](../CLAUDE.md#visual-identity-from-the-prototype) (fonts, tokens, dark gallery look) and an empty round stage.
**Done when** the deployed Pages URL shows the shell.

## M1 · Solver core
- Port the solver from `reference/prototype.html` to `src/core/solver.ts` (+ `shading.ts`, `rng.ts`, `targets.ts`, `layouts.ts`).
- Switch to clamped boundaries; confirm results still match the reference visually.
- Worker wrapper streaming progress (iteration, loss, height snapshot every 5 iterations, transferables).
- All tests from [SOLVER.md §8 Testing](SOLVER.md#8-testing), especially the gradient check. (Test 6 checks exports, so it lands with M4.)
- Interim Canvas 2D preview on the stage, with lamp buttons for A, C and flat light, so the solve can be watched. M2's WebGL stage replaces it.
**Done when** the 2-lamp sample (crescent + نور) solves in under 8 s and the tests pass.

## M2 · Stage
- WebGL2 shading shader for the height field; lamp ring with drag, keyboard control, lamp-height slider, flat-light button, auto-sweep that dwells on each lamp.
- Live update while solving; loss chart; documentation plates (overhead + one per lamp).
- Two / three picture modes with the sample targets.
- The method section as in the prototype: target thumbnails, loss chart and height map (the owner approved the thumbnails and height map on 2026-10-07).
**Done when** it matches the prototype's look and runs at 60 fps while dragging on a laptop.

## M3 · Targets and layouts
- Upload pictures per lamp (crop, levels, disc fade), drag-and-drop.
- Text-to-target: type a message, pick a font (Latin + Persian via Vazirmatn), size, weight.
- Lamp layout editor: 2–4 lamps, azimuth and elevation per lamp, warnings for opposite or crowded lamps, quick low-res preview solve (n = 48) while editing.
- Save / load a project as a JSON file (targets as PNG data, layout, params, seed).

## M4 · Export and the physical object
- Export 16-bit displacement PNG, binary STL with a base and mm scale, OBJ.
- Physical panel: diameter or width in mm, base thickness, depth readout, slope limit.
- three.js medallion preview with an orbiting lamp.
- **Make one real test print** (resin, then plaster cast) and photograph it under a lamp. Record what the material changes (contrast, tolerance) in `docs/PHYSICAL.md`.

## M5 · Decoding Surfaces
- Single-key message mode.
- Decoy + secret mode (decoy under normal light).
- Two-color combination lock (red + cyan lamps, visual-cryptography split), with stage support for colored lamps.
- QR code target (level H) with a "scan test" in the stage view.

## M6 · Scale and fidelity
- WebGPU compute solver behind the same interface, CPU fallback. Target: 1024² grid.
- Cast shadows in the renderer, then in the solver (research).
- Slope-limit penalty for printability.

## M7 · v0.1 public release
- README with GIFs of pictures emerging, a hosted demo, three example projects, a "how it works" page adapted from the solver notes ([SOLVER.md](SOLVER.md)).
- Open the repo for issues; tag v0.1.0.
