import { useRef, type KeyboardEvent } from "react";
import type { LayoutWarning } from "../../core/layouts";
import { azimuthOf, normalizeAz } from "../../render/stage/lamp";

const R = 38;
const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);
const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (deg: number, r: number): [number, number] => [
  50 + r * Math.cos(rad(deg)),
  50 + r * Math.sin(rad(deg)),
];

interface RingLamp {
  key: string;
  az: number;
}

/**
 * The layout seen from above: where each lamp stands around the medallion. Drag a lamp, or focus
 * it and use the arrow keys (1°, or 15° with Shift). Pairs that will interfere are joined by a line.
 */
export function LayoutRing({
  lamps,
  warnings,
  onMove,
}: {
  lamps: readonly RingLamp[];
  warnings: readonly LayoutWarning[];
  onMove: (index: number, az: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);

  const aim = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg || dragging.current === null) return;
    const r = svg.getBoundingClientRect();
    onMove(
      dragging.current,
      Math.round(azimuthOf(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2))) %
        360,
    );
  };

  const onKeyDown = (index: number, az: number) => (event: KeyboardEvent<SVGGElement>) => {
    const step = event.shiftKey ? 15 : 1;
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? step
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -step
          : 0;
    if (!delta) return;
    event.preventDefault();
    onMove(index, normalizeAz(az + delta));
  };

  const pairs = warnings.flatMap((w) =>
    w.kind === "opposite" || w.kind === "crowded" ? [{ kind: w.kind, lamps: w.lamps }] : [],
  );

  return (
    <svg
      ref={svgRef}
      className="layout-ring"
      viewBox="0 0 100 100"
      onPointerMove={(event) => {
        aim(event.clientX, event.clientY);
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
    >
      <g aria-hidden="true">
        <circle className="layout-ring__disc" cx="50" cy="50" r={R - 6} />
        <circle className="layout-ring__circle" cx="50" cy="50" r={R} />
        {TICKS.map((a) => {
          const [x1, y1] = polar(a, R - (a % 90 === 0 ? 3 : a % 30 === 0 ? 2 : 1));
          const [x2, y2] = polar(a, R);
          return <line key={a} className="layout-ring__tick" x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        {pairs.map(({ kind, lamps: [i, j] }) => {
          const a = lamps[i];
          const b = lamps[j];
          if (!a || !b) return null;
          const [x1, y1] = polar(a.az, R);
          const [x2, y2] = polar(b.az, R);
          return (
            <line
              key={`${kind}-${String(i)}-${String(j)}`}
              className={`layout-ring__pair layout-ring__pair--${kind}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
            />
          );
        })}
      </g>
      {lamps.map(({ key, az }, index) => {
        const [x, y] = polar(az, R);
        const rounded = Math.round(normalizeAz(az)) % 360;
        return (
          <g
            key={key}
            className="layout-ring__lamp"
            tabIndex={0}
            role="slider"
            aria-label={`Lamp ${key} azimuth`}
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={rounded}
            aria-valuetext={`${String(rounded)} degrees`}
            onPointerDown={(event) => {
              dragging.current = index;
              svgRef.current?.setPointerCapture(event.pointerId);
            }}
            onKeyDown={onKeyDown(index, az)}
          >
            <circle cx={x} cy={y} r={5.2} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central">
              {key}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
