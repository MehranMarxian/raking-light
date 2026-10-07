import { useEffect, useMemo, useRef } from "react";
import { DEFAULTS, gridSize } from "../core/defaults";
import { SAMPLE_LAYOUTS } from "../core/layouts";
import { plateSpecs, type PlateSpec } from "../render/plates";
import { createCanvasPainter } from "../render/stage/canvas2d";
import { formatAz } from "../render/stage/lamp";
import type { ReliefPainter } from "../render/stage/painter";
import { useAppStore, type Mode } from "../state/store";
import { LampLabel } from "./LampText";
import { LAYOUT_LAMPS } from "./layoutLamps";
import { usePaintKey } from "./usePaintKey";
import "./Plates.css";

const F = gridSize(DEFAULTS.n, DEFAULTS.C);
const painters = new WeakMap<HTMLCanvasElement, ReliefPainter>();

function painterFor(canvas: HTMLCanvasElement): ReliefPainter {
  let painter = painters.get(canvas);
  if (!painter) {
    painter = createCanvasPainter(canvas, F, DEFAULTS.boundary);
    painters.set(canvas, painter);
  }
  return painter;
}

function PlateCaption({ spec, mode }: { spec: PlateSpec; mode: Mode }) {
  switch (spec.kind) {
    case "overhead":
      return (
        <>
          <span className="plate__title">Normal light</span>
          <span className="cap">EL 90° · overhead</span>
        </>
      );
    case "lamp": {
      const lamp = LAYOUT_LAMPS[mode][spec.index];
      return (
        <>
          <span className="plate__title">Lamp {lamp && <LampLabel lamp={lamp} />}</span>
          <span className="cap">
            AZ {formatAz(spec.az)} · EL {spec.el}°
          </span>
        </>
      );
    }
    case "between":
      return (
        <>
          <span className="plate__title">Between the lamps</span>
          <span className="cap">
            AZ {formatAz(spec.az)} · EL {spec.el}° · cross-fade
          </span>
        </>
      );
  }
}

/** One surface, four readings: the same field under overhead light and under each lamp. */
export function Plates() {
  const mode = useAppStore((s) => s.mode);
  const paintKey = usePaintKey();
  const specs = useMemo(() => plateSpecs(SAMPLE_LAYOUTS[mode]), [mode]);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);

  // Plates are still images: repaint them on the paint key, one plate per frame.
  useEffect(() => {
    const { heights } = useAppStore.getState();
    if (!heights) return;
    let index = 0;
    let frame = requestAnimationFrame(function paintNext() {
      const spec = specs[index];
      const canvas = canvases.current[index];
      if (spec && canvas) {
        const painter = painterFor(canvas);
        painter.setHeights(heights);
        painter.draw(spec.az, spec.el);
      }
      index++;
      if (index < specs.length) frame = requestAnimationFrame(paintNext);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [paintKey, specs]);

  return (
    <section aria-labelledby="plates-title">
      <div className="section-head">
        <span className="eyebrow">Documentation plates</span>
        <h2 id="plates-title">One surface, four readings</h2>
        <p className="muted">
          Conservators photograph inscriptions and paintings under raking light to reveal tool marks
          that flat light hides. This app turns that technique into a medium. All four plates below
          are the same height field; only the lamp moves.
        </p>
      </div>
      <div className="plates">
        {specs.map((spec, i) => (
          <figure className="plate" key={`${spec.kind}-${String(i)}`}>
            <canvas
              ref={(canvas) => {
                canvases.current[i] = canvas;
              }}
              width={F}
              height={F}
            />
            <figcaption>
              <PlateCaption spec={spec} mode={mode} />
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
