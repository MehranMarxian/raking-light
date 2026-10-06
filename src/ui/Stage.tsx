import type { CSSProperties } from "react";
import { DEFAULTS, gridSize } from "../core/defaults";
import { useAppStore, type SolverStatus } from "../state/store";
import "./Stage.css";

/** Goniometer ring radius in the stage's 100-unit viewBox. */
const R = 45.5;
const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);
const F = gridSize(DEFAULTS.n, DEFAULTS.C);

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (deg: number, r: number): [number, number] => [
  50 + r * Math.cos(rad(deg)),
  50 + r * Math.sin(rad(deg)),
];
const point = (deg: number, r: number) => polar(deg, r).join(",");
const azLabel = (deg: number) =>
  `${String(Math.round(((deg % 360) + 360) % 360)).padStart(3, "0")}°`;

const BADGE: Record<SolverStatus, string> = {
  starting: "Waking the solver…",
  ready: "Solver ready · awaiting pictures",
  unavailable: "Solver unavailable in this browser",
};

/**
 * The round stage: a medallion inside a goniometer ring, lit by one lamp.
 * Until the solver lands (M1) and the WebGL renderer replaces this (M2), the
 * medallion shows unsolved plaster: seeded noise shaded by an SVG distant light
 * from the store's lamp, at the same azimuth and elevation the solver will use.
 */
export function Stage() {
  const { az, el } = useAppStore((s) => s.lamp);
  const solver = useAppStore((s) => s.solver);

  const [lampX, lampY] = polar(az, R);
  const spread = 20 * Math.max(0.2, 1 - el / 90);
  // Plaster dims away from a low lamp. CSS gradient angles start at the top,
  // azimuths at the right, so the far side of the disc is at az + 180° + 90°.
  const falloff = { "--falloff-angle": `${az + 270}deg` } as CSSProperties;

  return (
    <figure className="stage">
      <div className="stage__frame">
        <div
          className="stage__art"
          role="img"
          aria-label={`Unsolved plaster under a raking lamp at azimuth ${Math.round(az)}°, elevation ${Math.round(el)}°`}
        >
          <div className="stage__medallion" style={falloff}>
            <svg className="stage__relief" viewBox={`0 0 ${F} ${F}`} aria-hidden="true">
              <filter
                id="rl-plaster"
                x="0"
                y="0"
                width="100%"
                height="100%"
                colorInterpolationFilters="sRGB"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.5"
                  numOctaves={2}
                  seed={DEFAULTS.seed}
                />
                <feDiffuseLighting
                  className="stage__light"
                  surfaceScale={4}
                  diffuseConstant={1.12}
                  result="lit"
                >
                  <feDistantLight azimuth={az} elevation={el} />
                </feDiffuseLighting>
                <feFlood className="stage__shadow" result="shadow" />
                <feComposite in="lit" in2="shadow" operator="arithmetic" k2={1} k3={1} />
              </filter>
              <rect width={F} height={F} filter="url(#rl-plaster)" />
            </svg>
          </div>

          <svg className="stage__ring" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <radialGradient id="rl-glow">
                <stop className="stage__glow-hot" offset="0" />
                <stop className="stage__glow-warm" offset="0.35" />
                <stop className="stage__glow-fade" offset="1" />
              </radialGradient>
            </defs>
            <circle className="stage__circle" cx="50" cy="50" r={R} />
            {TICKS.map((a) => {
              const [x1, y1] = polar(a, R - (a % 30 === 0 ? 1.8 : 1));
              const [x2, y2] = polar(a, R);
              return <line key={a} className="stage__tick" x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
            <polygon
              className="stage__beam"
              points={`${point(az, R)} ${point(az + spread, R * 0.55)} ${point(az - spread, R * 0.55)}`}
              style={{ opacity: el > 70 ? 0 : 1 - el / 70 }}
            />
            <circle cx={lampX} cy={lampY} r={4.2} fill="url(#rl-glow)" />
            <circle className="stage__bulb" cx={lampX} cy={lampY} r={1.3} />
          </svg>
        </div>

        <p className="stage__badge" role="status" data-status={solver}>
          {BADGE[solver]}
        </p>
      </div>

      <figcaption className="stage__caption">
        <span className="stage__title">Unsolved plaster</span>
        <span className="cap">
          AZ {azLabel(az)} · EL {Math.round(el)}° · {F} × {F} heights
        </span>
      </figcaption>
    </figure>
  );
}
