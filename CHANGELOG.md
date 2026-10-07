# Changelog

Notable changes to Raking Light, one note per milestone. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### M2 · Stage (2026-10-07)

- WebGL2 stage renderer: the heights go up as an R32F texture and a fragment shader shades them with the prototype's palette. It matches the CPU renderer within 1 colour level, and the canvas renderer remains the fallback.
- The lamp moves by dragging around the stage or with the arrow keys (3°, or 15° with Shift). There's a lamp-height slider, flat light, a button per picture, and an auto-sweep that rests on each lamp and stops when you take over.
- Two or three hidden pictures. The three-lamp sample solves in 4.6–4.9 s, against 7.5 s for the prototype.
- Documentation plates (overhead, each lamp, and the cross-fade), a live loss chart, and the method section with target thumbnails and the height map, as in the prototype.
- Per-frame work while dragging, production build on a desktop: about 1 ms median and under 2.5 ms at the 95th percentile, against a 16.7 ms frame at 60 fps.

### M1 · Solver core (2026-10-07)

- The solver is ported to `src/core` (rng, shading, targets, layouts, solver) with clamped edges by default. With the prototype's periodic edges it reproduces the prototype bit for bit.
- Tests 1–5 from SOLVER.md §8 (gradient check, loss decrease, determinism, flat-light uniformity, two-lamp separation) plus the prototype parity test; 28 tests in all.
- The solver runs in a Web Worker and streams progress with transferred height snapshots every 5 iterations.
- The page solves the 2-lamp sample (crescent + نور) on load in 3.5–3.6 s, to a final loss of 0.022. The stage paints it live with an interim Canvas 2D renderer, and lamp buttons switch between A, C and flat light.
- The ground is now pitch black, the title stays on one line at any width, and the SVG-noise stand-in is gone.

### M0 · Scaffold (2026-10-07)

- Project plan split into `CLAUDE.md`, `docs/ROADMAP.md` and `docs/SOLVER.md`; the prototype moved to `reference/prototype.html`.
- Vite 8, React 19, TypeScript 6.0 (strict), Zustand, Comlink, Vitest 5, ESLint 10 and Prettier, on Node 24.
- `src/core` checked without DOM types and guarded against framework imports; wired to Vitest with the tuned solver defaults.
- CI (lint, format, test, build) on every push; GitHub Pages deployment from `main`.
- App shell in the gallery identity with self-hosted fonts, and an empty round stage: unsolved plaster in a goniometer ring, lamp at AZ 270° · EL 18°.
- A Comlink worker stub answers the shell on load, confirming the worker builds and loads under the Pages base path.
