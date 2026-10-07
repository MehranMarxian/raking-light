import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { DEFAULTS, gridSize } from "../core/defaults";
import { plateSpecs, type PlateSpec } from "../render/plates";
import { formatAz } from "../render/stage/lamp";
import { cachedCanvasPainter } from "../render/stage/painterCache";
import { useAppStore } from "../state/store";
import { LampLabel } from "./LampText";
import { useStageLamps, type StageLamp } from "./stageLamps";
import { usePaintKey } from "./usePaintKey";
import "./Plates.css";

const COUNT_WORDS = ["", "one", "two", "three", "four", "five"];

function PlateCaption({ spec, lamps }: { spec: PlateSpec; lamps: readonly StageLamp[] }) {
  switch (spec.kind) {
    case "overhead":
      return (
        <>
          <span className="plate__title">Normal light</span>
          <span className="cap">EL 90° · overhead</span>
        </>
      );
    case "lamp": {
      const lamp = lamps[spec.index];
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

/** One surface, several readings: the same field under overhead light and under each lamp. */
export function Plates() {
  const lamps = useStageLamps();
  const boundary = useAppStore((s) => s.project?.params.boundary ?? DEFAULTS.boundary);
  const paintKey = usePaintKey();
  const specs = useMemo(() => plateSpecs(lamps), [lamps]);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);

  // Plates are still images: repaint them on the paint key, one plate per frame.
  useEffect(() => {
    const { field } = useAppStore.getState();
    if (!field) return;
    const F = gridSize(field.n, field.C);
    let index = 0;
    let frame = requestAnimationFrame(function paintNext() {
      const spec = specs[index];
      const canvas = canvases.current[index];
      if (spec && canvas) {
        const painter = cachedCanvasPainter(canvas, F, boundary);
        painter.setHeights(field.heights);
        painter.draw(spec.az, spec.el);
      }
      index++;
      if (index < specs.length) frame = requestAnimationFrame(paintNext);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [paintKey, specs, boundary]);

  return (
    <section aria-labelledby="plates-title">
      <div className="section-head">
        <span className="eyebrow">Documentation plates</span>
        <h2 id="plates-title">One surface, {COUNT_WORDS[specs.length] ?? specs.length} readings</h2>
        <p className="muted">
          Conservators photograph inscriptions and paintings under raking light to reveal tool marks
          that flat light hides. This app turns that technique into a medium. All the plates below
          are the same height field; only the lamp moves.
        </p>
      </div>
      <div className="plates" style={{ "--plates": specs.length } as CSSProperties}>
        {specs.map((spec, i) => (
          <figure className="plate" key={`${spec.kind}-${String(i)}`}>
            <canvas
              ref={(canvas) => {
                canvases.current[i] = canvas;
              }}
            />
            <figcaption>
              <PlateCaption spec={spec} lamps={lamps} />
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
