import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { DEFAULTS, gridSize } from "../core/defaults";
import { azimuthOf, keyStep, normalizeAz } from "../render/stage/lamp";
import { createStagePainter } from "../render/stage/painter";
import { useAppStore, type SolveState } from "../state/store";
import { useStageLamps } from "./stageLamps";
import "./Stage.css";

/** Goniometer ring radius in the stage's 100-unit viewBox. */
const R = 45.5;
const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (deg: number, r: number): [number, number] => [
  50 + r * Math.cos(rad(deg)),
  50 + r * Math.sin(rad(deg)),
];
const point = (deg: number, r: number) => polar(deg, r).join(",");

function badgeText({ status, iteration, iterations }: SolveState): string | null {
  switch (status) {
    case "preparing":
      return "Preparing the surface…";
    case "solving":
      return `Solving surface · step ${iteration} / ${iterations}`;
    case "done":
      return null;
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
 * The round stage: the relief in a goniometer ring, lit by one lamp. Drag anywhere on it to move
 * the lamp, or focus the lamp and use the arrow keys.
 */
export function Stage() {
  const { az, el } = useAppStore((s) => s.lamp);
  const solve = useAppStore((s) => s.solve);
  const moveLamp = useAppStore((s) => s.moveLamp);
  const reliefRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lamps = useStageLamps();
  const F = useAppStore((s) => (s.field ? gridSize(s.field.n, s.field.C) : 0));
  const boundary = useAppStore((s) => s.project?.params.boundary ?? DEFAULTS.boundary);

  // The painter draws outside React: at most once a frame, whenever the field or the lamp moves.
  // A field of another size (a loaded project) gets a fresh painter.
  useEffect(() => {
    const host = reliefRef.current;
    if (!host || !F) return;
    const painter = createStagePainter(host, F, boundary, "stage__relief");
    host.dataset.renderer = painter.kind;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const { field, lamp } = useAppStore.getState();
      if (field?.heights.length !== F * F) return;
      painter.setHeights(field.heights);
      painter.draw(lamp.az, lamp.el);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    schedule();
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (state.field !== previous.field || state.lamp !== previous.lamp) schedule();
    });
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
      painter.dispose();
    };
  }, [F, boundary]);

  const aimAt = (event: PointerEvent<HTMLDivElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    moveLamp({
      az: azimuthOf(event.clientX - (r.left + r.width / 2), event.clientY - (r.top + r.height / 2)),
    });
  };

  const onKeyDown = (event: KeyboardEvent<SVGCircleElement>) => {
    const step = keyStep(event.key, event.shiftKey);
    if (step === null) return;
    event.preventDefault();
    moveLamp({ az: normalizeAz(az + step) });
  };

  const [lampX, lampY] = polar(az, R);
  const spread = 20 * Math.max(0.2, 1 - el / 90);
  const badge = badgeText(solve);
  const azRounded = Math.round(normalizeAz(az)) % 360;

  return (
    <div className="stage-wrap">
      <div
        className="stage"
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          aimAt(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) aimAt(event);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <div
          ref={reliefRef}
          className="stage__medallion"
          role="img"
          aria-label="Rendered relief surface lit by the virtual lamp"
        />

        <svg className="stage__ring" viewBox="0 0 100 100">
          <g aria-hidden="true">
            <defs>
              <radialGradient id="rl-glow">
                <stop className="stage__glow-hot" offset="0" />
                <stop className="stage__glow-warm" offset="0.35" />
                <stop className="stage__glow-fade" offset="1" />
              </radialGradient>
            </defs>
            <circle className="stage__circle" cx="50" cy="50" r={R} />
            {TICKS.map((a) => {
              const major = lamps.some((l) => l.az === a);
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
            {lamps.map(({ key, az: lampAz }) => {
              const [x, y] = polar(lampAz, R + 4.6);
              return (
                <text
                  key={key}
                  className="stage__lamp-key"
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {key}
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
          </g>
          <circle
            className="stage__handle"
            cx={lampX}
            cy={lampY}
            r={4.5}
            tabIndex={0}
            role="slider"
            aria-label="Lamp direction"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={azRounded}
            aria-valuetext={`${String(azRounded)} degrees`}
            onKeyDown={onKeyDown}
          />
        </svg>

        {badge && (
          <p className="stage__badge" data-status={solve.status} aria-hidden="true">
            {badge}
          </p>
        )}
        <p className="sr-only" role="status">
          {announcement(solve)}
        </p>
      </div>
    </div>
  );
}
