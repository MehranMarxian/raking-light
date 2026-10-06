# Raking Light · Solver

How Raking Light turns a set of pictures into one height field. Everything here was verified in `reference/prototype.html` on 2026-10-07.

## 1. Model

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

## 2. Loss

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

## 3. Gradient

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

## 4. Optimizer

Adam, `lr = 0.05`, `β1 = 0.9`, `β2 = 0.999`, `ε = 1e−12`, 300 iterations. Initialize `h ~ N(0, 0.6)` from a seeded PRNG (mulberry32, seed 7 in the prototype) so results are reproducible. Stream a height snapshot to the UI every 5 iterations so the user watches the pictures emerge.

Cost per iteration: two passes over `F²` facets per lamp (forward, then gradient). 384², 2 lamps + flat: about 15–25 ms in JS.

## 5. Tuned defaults

| Parameter | Value | Note |
|---|---|---|
| n, C, F | 96, 4, 384 | 147,456 heights |
| Solve elevation | 18° | lower = crisper pictures, narrower key |
| lo / hi | 0.10 / 0.85 | background can't go much below sin(e) ≈ 0.31 anyway |
| Flat target / weight | 0.6 / 4 | |
| Adam lr / iterations | 0.05 / 300 | loss mostly flat after ~150 |
| Init σ | 0.6 | texture everywhere from the start |

## 6. Findings

- **2 lamps at 90° apart:** clean separation, final loss ≈ 0.02–0.025.
- **3 lamps at 120°:** visible negative ghosts, final loss ≈ 0.03–0.06. Reason: for small slopes, `s_k ≈ sin e − cos e · D_θk h`, and `D_0 + D_120 + D_240 = 0`. The clamp `max(u,0)` is the only thing breaking that constraint.
- **Opposite lamps (θ and θ+180°):** near-inverse pictures. Warn in the layout editor.
- **Key tolerance:** pictures cross-fade over about ±25° of azimuth.
- **Physical scale:** on a 120 mm disc (pitch 0.3125 mm), peak-to-valley depth ≈ 3.1–3.4 mm.
- **Boundaries:** the prototype wraps around (periodic). Use clamped boundaries for export.

## 7. Decoding Surfaces modes (M5)

**Single key.** Text rendered to a target, assigned to one lamp. Weakest lock: a flashlight sweep finds it.

**Decoy + secret.** Replace the flat-light term's constant 0.6 with a decoy picture (mapped to a narrow range, e.g. 0.5–0.7). Normal room light shows the decoy; the raking key shows the secret.

**Two-color combination lock.** Two lamps 90° apart, one red, one cyan, both on together. Per cell, draw a random bit `N`:
- red lamp target  = `N` (bright or dark at random)
- cyan lamp target = `N` inside the message, `1 − N` outside it

Each lamp alone shows independent random speckle, with no information about the message (same principle as visual cryptography). With both lamps on, cells inside the letters are neutral (both dark or both bright) and cells outside are strongly red or cyan, so the text appears as neutral letters on colored confetti. Rendering needs per-lamp color, which the stage shader already supports by summing lamps.

**QR targets.** A version 1 QR code (21 × 21 modules) fits the 96-cell grid at about 4 cells per module. Use error correction level H to absorb ghosting.

## 8. Testing

Must-have tests in `tests/core/`:

1. **Gradient check.** On a 16×16 grid (n = 4, C = 4) with random h, compare the analytic gradient to central finite differences (step 1e−4, float64) for 20 random indices. Relative error < 1e−3. Skip facets near `u = 0` (non-differentiable).
2. **Loss decreases.** 50 iterations on a small target reduce the loss by at least 50 %.
3. **Determinism.** Same seed and inputs → bit-identical height field.
4. **Flat-light uniformity.** After solving, the std of overhead cell brightness is below a threshold (calibrate from the reference).
5. **Two-lamp separation.** After solving two binary targets, correlation between the lamp-A render and target A is > 0.8, and with target B is < 0.2.
6. **Exports.** STL triangle count and bounding box match the grid and mm scale; the 16-bit PNG round-trips through `fast-png` within ±1 level.

## 9. Open research
- Cast shadows (ray-march along the lamp direction) for keys narrower than ±25°.
- Point lights at a known distance as a "keyhole" key.
- WebGPU compute for 1024² grids.
- Slope limits for printability (penalty on |∇h| above a threshold).
