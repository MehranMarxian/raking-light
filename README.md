# Raking Light

Relief surfaces that hide pictures. Under flat light the surface reads as even, speckled plaster. Under a low raking lamp from one particular direction, a picture rises out of the shadows; move the lamp, and a different one appears. The solved surface exports as a displacement map or a printable mesh, ready to 3D-print and cast in plaster.

**Status:** early scaffold (milestone M0). There is nothing to solve yet; see the [roadmap](docs/ROADMAP.md).

**Live:** <https://mehranmarxian.github.io/raking-light/>

## Privacy

Raking Light runs entirely in your browser. Nothing you upload ever leaves it: no server, no accounts, no analytics.

## Develop

Requires Node 24 (see `.nvmrc`) and npm.

```bash
npm ci
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the build at http://localhost:4173/raking-light/ |
| `npm test` | Run the Vitest suite once |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, writing changes |

## Docs

- [docs/ROADMAP.md](docs/ROADMAP.md): milestones and their definitions of done
- [docs/SOLVER.md](docs/SOLVER.md): the math behind the surface
- [CLAUDE.md](CLAUDE.md): the project brief, stack and conventions

## License

[MIT](LICENSE) © 2026 Mehran Ahmadi
