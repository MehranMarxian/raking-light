// The solver loop from reference/prototype.html (the worker source), copied verbatim as a test
// oracle. Only the message plumbing differs: it is a function that takes the message data and
// returns the snapshots the worker would have posted. Not formatted, so it diffs cleanly
// against the prototype.
export function prototypeSolve(data) {
  const snapshots = [];
  const { targets, az, elev, n, C, iters, seed } = data;
  const F = n * C, NN = F * F, cells = n * n;
  const lo = 0.1, hi = 0.85, flatT = 0.6, wFlat = 4, lr = 0.05;
  let st = seed >>> 0;
  const rnd = () => { st |= 0; st = st + 0x6D2B79F5 | 0; let t = Math.imul(st ^ st >>> 15, 1 | st); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const h = new Float32Array(NN), m = new Float32Array(NN), v = new Float32Array(NN), g = new Float32Array(NN);
  for (let i = 0; i < NN; i++) { const u1 = rnd() || 1e-9, u2 = rnd(); h[i] = 0.6 * Math.sqrt(-2 * Math.log(u1)) * Math.cos(6.2831853 * u2); }
  const el = elev * Math.PI / 180;
  const lights = az.map((a, k) => { const t = a * Math.PI / 180; const T = new Float32Array(cells); for (let c = 0; c < cells; c++) T[c] = lo + (hi - lo) * targets[k][c]; return { L: [Math.cos(el) * Math.cos(t), Math.cos(el) * Math.sin(t), Math.sin(el)], T, w: 1 }; });
  const TF = new Float32Array(cells).fill(flatT);
  lights.push({ L: [0, 0, 1], T: TF, w: wFlat });
  const cm = new Float32Array(cells), r = new Float32Array(cells);
  const b1 = 0.9, b2 = 0.999, inv = 1 / (C * C);

  for (let it = 1; it <= iters; it++) {
    g.fill(0); let loss = 0;
    for (const { L, T, w } of lights) {
      const Lx = L[0], Ly = L[1], Lz = L[2];
      cm.fill(0);
      for (let y = 0; y < F; y++) {
        const row = y * F, down = ((y + 1) % F) * F, cy = ((y / C) | 0) * n;
        for (let x = 0; x < F; x++) {
          const i = row + x, hi0 = h[i];
          const hx = h[row + ((x + 1) % F)] - hi0, hy = h[down + x] - hi0;
          const u = -Lx * hx - Ly * hy + Lz;
          if (u > 0) cm[cy + ((x / C) | 0)] += u / Math.sqrt(1 + hx * hx + hy * hy);
        }
      }
      for (let c = 0; c < cells; c++) { const d = cm[c] * inv - T[c]; r[c] = d; loss += w * d * d; }
      const sc = 2 * w * inv / cells;
      for (let y = 0; y < F; y++) {
        const row = y * F, down = ((y + 1) % F) * F, cy = ((y / C) | 0) * n;
        for (let x = 0; x < F; x++) {
          const i = row + x, hi0 = h[i], right = row + ((x + 1) % F);
          const hx = h[right] - hi0, hy = h[down + x] - hi0;
          const u = -Lx * hx - Ly * hy + Lz;
          if (u <= 0) continue;
          const q2 = 1 + hx * hx + hy * hy, q = Math.sqrt(q2), q3 = q2 * q;
          const d = r[cy + ((x / C) | 0)] * sc;
          const dhx = d * (-Lx / q - u * hx / q3), dhy = d * (-Ly / q - u * hy / q3);
          g[right] += dhx; g[down + x] += dhy; g[i] -= dhx + dhy;
        }
      }
    }
    loss /= cells;
    const c1 = 1 - Math.pow(b1, it), c2 = 1 - Math.pow(b2, it);
    for (let i = 0; i < NN; i++) {
      const gi = g[i] + 1e-7 * h[i];
      m[i] = b1 * m[i] + (1 - b1) * gi; v[i] = b2 * v[i] + (1 - b2) * gi * gi;
      h[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + 1e-12);
    }
    if (it % 5 === 0 || it === iters || it === 1) {
      snapshots.push({ it, loss, h: h.slice(0) });
    }
  }
  return snapshots;
}
