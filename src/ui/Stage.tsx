import { useEffect, useRef } from "react";
import { DEFAULTS, gridSize } from "../core/defaults";
import { SAMPLE_LAYOUTS, SAMPLE_PICTURES, angularDistance, type Picture } from "../core/layouts";
import { createReliefPainter, type ReliefPainter } from "../render/stage/canvas2d";
import { useAppStore, type Lamp, type SolveState } from "../state/store";
import "./Stage.css";

/** Goniometer ring radius in the stage's 100-unit viewBox. */
const R = 45.5;
const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);
const F = gridSize(DEFAULTS.n, DEFAULTS.C);
const FLAT_EL = 90;

/** The lamps of the sample being solved, with their pictures. */
const LAMPS = SAMPLE_LAYOUTS.two.flatMap(({ picture, az, el }) => {
  const pic = SAMPLE_PICTURES[picture];
  return pic ? [{ pic, az, el }] : [];
});

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (deg: number, r: number): [number, number] => [
  50 + r * Math.cos(rad(deg)),
  50 + r * Math.sin(rad(deg)),
];
const point = (deg: number, r: number) => polar(deg, r).join(",");
const azLabel = (deg: number) =>
  `${String(Math.round(((deg % 360) + 360) % 360)).padStart(3, "0")}°`;

function PictureName({ pic }: { pic: Picture }) {
  return <bdi lang={pic.lang}>{pic.name}</bdi>;
}

/** Plate title for where the lamp is, as in the prototype. */
function LampTitle({ lamp }: { lamp: Lamp }) {
  if (lamp.el >= 70) return <>Normal light</>;
  if (lamp.el >= 40) return <>Lamp too high for clear pictures</>;
  const near = LAMPS.find((l) => angularDistance(lamp.az, l.az) <= 14);
  if (!near) return <>Between lamps</>;
  return (
    <>
      Lamp {near.pic.key} · <PictureName pic={near.pic} />
    </>
  );
}

function badgeText({ status, iteration, iterations, loss, ms }: SolveState): string {
  switch (status) {
    case "preparing":
      return "Preparing the surface…";
    case "solving":
      return `Solving · step ${iteration} / ${iterations}${loss === null ? "" : ` · loss ${loss.toFixed(3)}`}`;
    case "done":
      return `Solved in ${((ms ?? 0) / 1000).toFixed(1)} s${loss === null ? "" : ` · loss ${loss.toFixed(3)}`}`;
    case "unavailable":
      return "Solver unavailable in this browser";
  }
}

/** Short status for screen readers, without the per-step churn. */
function announcement({ status, ms }: SolveState): string {
  switch (status) {
    case "preparing":
      return "Preparing the surface.";
    case "solving":
      return "Solving the surface.";
    case "done":
      return `Surface solved in ${((ms ?? 0) / 1000).toFixed(1)} seconds.`;
    case "unavailable":
      return "The solver is unavailable in this browser.";
  }
}

/**
 * The round stage: the relief in a goniometer ring, lit by one lamp. M1 paints it with an interim
 * canvas renderer; M2 replaces that with WebGL and adds dragging, the height slider and the sweep.
 */
export function Stage() {
  const lamp = useAppStore((s) => s.lamp);
  const heights = useAppStore((s) => s.heights);
  const solve = useAppStore((s) => s.solve);
  const setLamp = useAppStore((s) => s.setLamp);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painterRef = useRef<ReliefPainter | null>(null);
  const { az, el } = lamp;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heights) return;
    painterRef.current ??= createReliefPainter(canvas, F, DEFAULTS.boundary);
    const painter = painterRef.current;
    const frame = requestAnimationFrame(() => {
      painter.paint(heights, az, el);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [heights, az, el]);

  const [lampX, lampY] = polar(az, R);
  const spread = 20 * Math.max(0.2, 1 - el / 90);

  return (
    <figure className="stage">
      <div className="stage__frame">
        <div
          className="stage__art"
          role="img"
          aria-label={`Relief surface under a lamp at azimuth ${Math.round(az)}°, elevation ${Math.round(el)}°`}
        >
          <div className="stage__medallion">
            <canvas ref={canvasRef} className="stage__relief" />
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
              const major = LAMPS.some((l) => l.az === a);
              const [x1, y1] = polar(a, R - (a % 30 === 0 ? 1.8 : 1));
              const [x2, y2] = polar(a, R + (major ? 2.2 : 0));
              return (
                <line
                  key={a}
                  className={major ? "stage__tick stage__tick--lamp" : "stage__tick"}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                />
              );
            })}
            {LAMPS.map(({ pic, az: lampAz }) => {
              const [x, y] = polar(lampAz, R + 4.6);
              return (
                <text
                  key={pic.key}
                  className="stage__lamp-key"
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {pic.key}
                </text>
              );
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

        <p className="stage__badge" data-status={solve.status} aria-hidden="true">
          {badgeText(solve)}
        </p>
        <p className="sr-only" role="status">
          {announcement(solve)}
        </p>
      </div>

      <figcaption className="stage__caption">
        <span className="stage__title">
          <LampTitle lamp={lamp} />
        </span>
        <span className="cap">
          AZ {azLabel(az)} · EL {Math.round(el)}°
        </span>
      </figcaption>

      <div className="stage__lamps" role="group" aria-label="Lamp position">
        {LAMPS.map(({ pic, az: lampAz, el: lampEl }) => (
          <button
            key={pic.key}
            type="button"
            className="btn"
            aria-pressed={az === lampAz && el === lampEl}
            onClick={() => {
              setLamp({ az: lampAz, el: lampEl });
            }}
          >
            {pic.key} · <PictureName pic={pic} />
          </button>
        ))}
        <button
          type="button"
          className="btn"
          aria-pressed={el === FLAT_EL}
          onClick={() => {
            setLamp({ az, el: FLAT_EL });
          }}
        >
          Flat light
        </button>
      </div>
    </figure>
  );
}
