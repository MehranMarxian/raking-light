import type { LossPoint } from "../state/store";

// Chart box and margins, as in the prototype.
const W = 320;
const H = 190;
const LEFT = 44;
const RIGHT = 12;
const TOP = 14;
const BOTTOM = 34;
const PW = W - LEFT - RIGHT;
const PH = H - TOP - BOTTOM;

const fmt = (v: number) => v.toFixed(3);

/** The loss falling over the solve: mismatch between rendered and target brightness. */
export function LossChart({
  history,
  iterations,
}: {
  history: readonly LossPoint[];
  iterations: number;
}) {
  const last = history[history.length - 1];
  const label = last
    ? `Loss falling over solver iterations; ${fmt(last[1])} at iteration ${String(last[0])}`
    : "Loss over solver iterations; the solve has not started";
  if (!last)
    return <svg className="loss-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} />;

  const ymax = Math.max(...history.map(([, loss]) => loss)) * 1.05;
  const X = (i: number) => LEFT + (i / iterations) * PW;
  const Y = (v: number) => TOP + PH - (v / ymax) * PH;
  const points = history.map(([i, v]) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const first = history[0] ?? last;
  const xTicks = [0, 1, 2, 3].map((k) => Math.round((k * iterations) / 3));

  return (
    <svg className="loss-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {[0, 0.5, 1].map((f) => {
        const v = (ymax / 1.05) * f;
        return (
          <g key={f}>
            <line className="loss-chart__grid" x1={LEFT} x2={W - RIGHT} y1={Y(v)} y2={Y(v)} />
            <text x={LEFT - 6} y={Y(v) + 3} textAnchor="end">
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {xTicks.map((i) => (
        <text key={i} x={X(i)} y={H - BOTTOM + 15} textAnchor="middle">
          {i}
        </text>
      ))}
      <line className="loss-chart__axis" x1={LEFT} x2={W - RIGHT} y1={TOP + PH} y2={TOP + PH} />
      <polygon
        className="loss-chart__area"
        points={`${X(first[0]).toFixed(1)},${String(TOP + PH)} ${points} ${X(last[0]).toFixed(1)},${String(TOP + PH)}`}
      />
      <polyline className="loss-chart__curve" points={points} />
      <circle className="loss-chart__dot" cx={X(last[0])} cy={Y(last[1])} r={3} />
      <text x={LEFT + PW / 2} y={H - 4} textAnchor="middle">
        iteration
      </text>
      <text
        className="loss-chart__value"
        x={Math.min(X(last[0]) + 6, W - RIGHT - 40)}
        y={Y(last[1]) - 8}
      >
        {fmt(last[1])}
      </text>
    </svg>
  );
}
