import { useEffect, useRef } from "react";
import { DEFAULTS, gridSize } from "../core/defaults";
import { paintHeightMap, paintTarget } from "../render/maps";
import { formatAz } from "../render/stage/lamp";
import { useAppStore } from "../state/store";
import { LossChart } from "./LossChart";
import { useStageLamps } from "./stageLamps";
import { usePaintKey } from "./usePaintKey";
import "./Method.css";

/** How the surface is solved: pictures become targets, the loss falls, one height field comes out. */
export function Method() {
  const project = useAppStore((s) => s.project);
  const n = project?.n ?? DEFAULTS.n;
  const C = project?.C ?? DEFAULTS.C;
  const F = gridSize(n, C);
  const solve = useAppStore((s) => s.solve);
  const lossHistory = useAppStore((s) => s.lossHistory);
  const paintKey = usePaintKey();
  const thumbs = useRef<(HTMLCanvasElement | null)[]>([]);
  const heightMap = useRef<HTMLCanvasElement>(null);
  const lamps = useStageLamps();

  useEffect(() => {
    project?.lamps.forEach((lamp, k) => {
      const canvas = thumbs.current[k];
      if (canvas) paintTarget(canvas, lamp.target, project.n);
    });
  }, [project]);

  useEffect(() => {
    const { field } = useAppStore.getState();
    if (field && heightMap.current) {
      paintHeightMap(heightMap.current, field.heights, gridSize(field.n, field.C));
    }
  }, [paintKey]);

  const lampList = lamps.map((l) => `${formatAz(l.az)} (EL ${String(l.el)}°)`).join(", ");
  const solveTime =
    solve.status === "done" && solve.ms !== null
      ? `${(solve.ms / 1000).toFixed(1)} s in this browser`
      : solve.status === "unavailable"
        ? "unavailable"
        : "running…";

  return (
    <section aria-labelledby="method-title">
      <div className="section-head">
        <span className="eyebrow">Under the hood</span>
        <h2 id="method-title">How the surface is solved</h2>
      </div>
      <div className="method">
        <div className="step">
          <div className="fig">
            <div className="targets">
              {lamps.map((lamp, k) => (
                <figure key={lamp.key}>
                  <canvas
                    ref={(canvas) => {
                      thumbs.current[k] = canvas;
                    }}
                    width={n}
                    height={n}
                    aria-label={`Target picture for lamp ${lamp.key}`}
                  />
                  <span className="cap">
                    {lamp.key} · {formatAz(lamp.az)}
                  </span>
                </figure>
              ))}
            </div>
          </div>
          <h3>Pictures become cell targets</h3>
          <p className="muted">
            Each picture is reduced to {n} × {n} cells and paired with a lamp direction. Every cell
            is backed by a {C} × {C} patch of heights, so the surface has{" "}
            {(F * F).toLocaleString("en")} heights to tune and room for small facets that face
            different lamps.
          </p>
        </div>

        <div className="step">
          <div className="fig">
            <LossChart history={lossHistory} iterations={solve.iterations} />
          </div>
          <h3>Gradient descent on the light</h3>
          <p className="muted">
            A renderer shades every facet with Lambert lighting, so facets turned away from a lamp
            fall dark. Brightness is averaged per cell, the way your eye averages it from a step
            back. Adam adjusts all heights together until each lamp&apos;s cells match its picture.
            One more term asks the overhead view to stay one even grey, which is why the plate reads
            as noise until the lamp drops.
          </p>
        </div>

        <div className="step">
          <div className="fig">
            <canvas
              ref={heightMap}
              className="height-map"
              width={F}
              height={F}
              aria-label="The solved height field as a displacement map"
            />
          </div>
          <h3>One height field out</h3>
          <dl className="facts">
            <dt>Grid</dt>
            <dd>
              {F} × {F} heights
            </dd>
            <dt>Lamps</dt>
            <dd>
              {lamps.length} at {lampList}
            </dd>
            <dt>Iterations</dt>
            <dd>{solve.iterations}</dd>
            <dt>Solve time</dt>
            <dd>{solveTime}</dd>
            <dt>Trade-off</dt>
            <dd>
              Two lamps set 90° apart act independently, so their pictures separate cleanly. A third
              lamp has to share facets with the other two: a cell that is bright for one lamp tends
              to go dark for the others, which leaves faint negative ghosts.
            </dd>
          </dl>
        </div>
      </div>
    </section>
  );
}
