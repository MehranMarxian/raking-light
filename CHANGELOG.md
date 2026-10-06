# Changelog

Notable changes to Raking Light, one note per milestone. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### M0 · Scaffold (2026-10-07)

- Project plan split into `CLAUDE.md`, `docs/ROADMAP.md` and `docs/SOLVER.md`; the prototype moved to `reference/prototype.html`.
- Vite 8, React 19, TypeScript 6.0 (strict), Zustand, Comlink, Vitest 5, ESLint 10 and Prettier, on Node 24.
- `src/core` checked without DOM types and guarded against framework imports; wired to Vitest with the tuned solver defaults.
- CI (lint, format, test, build) on every push; GitHub Pages deployment from `main`.
- App shell in the gallery identity with self-hosted fonts, and an empty round stage: unsolved plaster in a goniometer ring, lamp at AZ 270° · EL 18°.
- A Comlink worker stub answers the shell on load, confirming the worker builds and loads under the Pages base path.
