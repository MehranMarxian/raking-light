# Changelog

Notable changes to Raking Light, one note per milestone. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
