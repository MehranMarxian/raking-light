import { useEffect, useId, useRef, type DragEvent } from "react";
import { gridSize, type Boundary } from "../../core/defaults";
import { SAMPLE_PICTURES } from "../../core/layouts";
import type { ProjectLamp, TextSpec } from "../../core/project";
import type { LampReport } from "../../core/report";
import { paintTarget } from "../../render/maps";
import { PictureError, imageToTarget, textToTarget } from "../../render/pictures";
import { loadSampleTargets } from "../../render/samples";
import { cachedCanvasPainter } from "../../render/stage/painterCache";
import type { Field } from "../../state/store";
import { TextForm } from "./TextForm";

const DEFAULT_TEXT: TextSpec = { text: "نور", family: "Vazirmatn", weight: 900, size: 0.85 };

/** A ghost this strong (relative to the lamp's own picture) is easy to see. */
const GHOST_WARN = 0.15;
const GHOST_BAD = 0.3;

function ReportLine({ report, keys, index }: { report: LampReport; keys: string; index: number }) {
  let worst = -1;
  let ghost = NaN;
  report.ghosts.forEach((g, j) => {
    if (j !== index && Number.isFinite(g) && !(Math.abs(g) <= Math.abs(ghost))) {
      worst = j;
      ghost = g;
    }
  });
  const level =
    Math.abs(ghost) >= GHOST_BAD ? "bad" : Math.abs(ghost) >= GHOST_WARN ? "warn" : "good";
  return (
    <p className="lamp-card__report" data-level={Number.isFinite(ghost) ? level : "good"}>
      Clarity {report.clarity.toFixed(2)}
      {Number.isFinite(ghost) && (
        <>
          {" "}
          · strongest ghost: {keys[worst] ?? "?"} {ghost >= 0 ? "+" : "−"}
          {Math.abs(ghost).toFixed(2)}
        </>
      )}
    </p>
  );
}

/**
 * One lamp in the layout editor: its picture (a sample, an uploaded image or text), its direction
 * and height, and how it fares in the latest preview solve.
 */
export function LampCard({
  index,
  lampKey,
  keys,
  lamp,
  n,
  boundary,
  preview,
  report,
  canRemove,
  onChange,
  onRemove,
  onStatus,
}: {
  index: number;
  lampKey: string;
  keys: string;
  lamp: ProjectLamp;
  n: number;
  boundary: Boundary;
  preview: Field | null;
  report: LampReport | undefined;
  canRemove: boolean;
  onChange: (patch: Partial<ProjectLamp>) => void;
  onRemove: () => void;
  onStatus: (message: string) => void;
}) {
  const id = useId();
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  // Picture work is async; only the newest request may land.
  const request = useRef(0);

  useEffect(() => {
    if (thumbRef.current) paintTarget(thumbRef.current, lamp.target, n);
  }, [lamp.target, n]);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !preview) return;
    const painter = cachedCanvasPainter(canvas, gridSize(preview.n, preview.C), boundary);
    painter.setHeights(preview.heights);
    painter.draw(lamp.az, lamp.el);
  }, [preview, lamp.az, lamp.el, boundary]);

  /** Prepares a picture; true when it landed on the lamp. */
  const setPicture = async (
    make: () => Promise<Pick<ProjectLamp, "source" | "target">>,
  ): Promise<boolean> => {
    const ticket = ++request.current;
    try {
      const picture = await make();
      if (ticket !== request.current) return false;
      onChange(picture);
      return true;
    } catch (error) {
      onStatus(
        error instanceof PictureError ? error.message : "That picture could not be prepared.",
      );
      return false;
    }
  };

  const applyImage = (file: File) => {
    void setPicture(async () => ({
      source: { kind: "image", name: file.name },
      target: await imageToTarget(file, n),
    })).then((ok) => {
      if (ok) onStatus(`Lamp ${lampKey} picture replaced. Solve to rebuild the surface.`);
    });
  };

  const applyText = (spec: TextSpec) => {
    void setPicture(async () => ({
      source: { kind: "text", spec },
      target: await textToTarget(spec, n),
    }));
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    const file = event.dataTransfer.files[0];
    if (!file?.type.startsWith("image/")) return;
    event.preventDefault();
    event.stopPropagation();
    applyImage(file);
  };

  const { source } = lamp;
  const choice = source.kind === "sample" ? `sample-${String(source.sample)}` : source.kind;

  return (
    <article
      className="lamp-card"
      aria-labelledby={`${id}-title`}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={onDrop}
    >
      <header className="lamp-card__head">
        <h3 id={`${id}-title`}>Lamp {lampKey}</h3>
        {canRemove && (
          <button type="button" className="btn btn--small" onClick={onRemove}>
            Remove
          </button>
        )}
      </header>

      <div className="lamp-card__figures">
        <figure>
          <canvas ref={thumbRef} className="lamp-card__target" width={n} height={n} />
          <figcaption className="cap">Picture</figcaption>
        </figure>
        <figure>
          <canvas ref={previewRef} className="lamp-card__preview" />
          <figcaption className="cap">Preview under {lampKey}</figcaption>
        </figure>
      </div>

      <div className="lamp-card__fields">
        <label htmlFor={`${id}-picture`}>Picture</label>
        <select
          id={`${id}-picture`}
          value={choice}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "text") {
              applyText(source.kind === "text" ? source.spec : DEFAULT_TEXT);
            } else if (value.startsWith("sample-")) {
              const sample = Number(value.slice("sample-".length));
              void setPicture(async () => ({
                source: { kind: "sample", sample },
                target: (await loadSampleTargets(n))[sample] ?? lamp.target,
              }));
            }
          }}
        >
          {SAMPLE_PICTURES.map((pic, k) => (
            <option key={pic.key} value={`sample-${String(k)}`}>
              Sample: {pic.name}
            </option>
          ))}
          <option value="text">Text…</option>
          {source.kind === "image" && <option value="image">Image: {source.name}</option>}
        </select>

        <span />
        <label className="btn btn--small lamp-card__upload">
          Upload an image
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) applyImage(file);
            }}
          />
        </label>

        <label htmlFor={`${id}-az`}>Azimuth</label>
        <span className="lamp-card__range">
          <input
            id={`${id}-az`}
            type="range"
            min={0}
            max={359}
            step={1}
            value={Math.round(lamp.az) % 360}
            onChange={(event) => {
              onChange({ az: Number(event.target.value) });
            }}
          />
          <span className="cap">{String(Math.round(lamp.az) % 360).padStart(3, "0")}°</span>
        </span>

        <label htmlFor={`${id}-el`}>Elevation</label>
        <span className="lamp-card__range">
          <input
            id={`${id}-el`}
            type="range"
            min={4}
            max={60}
            step={1}
            value={Math.round(lamp.el)}
            onChange={(event) => {
              onChange({ el: Number(event.target.value) });
            }}
          />
          <span className="cap">{Math.round(lamp.el)}°</span>
        </span>
      </div>

      {source.kind === "text" && <TextForm spec={source.spec} onChange={applyText} />}

      {report && <ReportLine report={report} keys={keys} index={index} />}
      <p className="cap lamp-card__hint">Drop an image on this card to use it.</p>
    </article>
  );
}
