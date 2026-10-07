import { useMemo, useState, type DragEvent } from "react";
import { MAX_LAMPS, MIN_LAMPS, layoutWarnings, type LayoutWarning } from "../../core/layouts";
import { ProjectError, parseProject, serializeProject } from "../../core/project";
import { loadSampleTargets, samplePreset } from "../../render/samples";
import { prefersReducedMotion, useAppStore } from "../../state/store";
import { LAMP_KEYS, stageLamps } from "../stageLamps";
import { PREVIEW_ITERATIONS } from "../useDraftPreview";
import { LampCard } from "./LampCard";
import { LayoutRing } from "./LayoutRing";
import { unusedSample, withAddedLamp, withLamp, withoutLamp } from "./draft";
import "./Editor.css";

const FILE_NAME = "raking-light-project.json";

function warningText(w: LayoutWarning): string {
  const key = (i: number) => LAMP_KEYS[i] ?? String(i + 1);
  switch (w.kind) {
    case "opposite":
      return `Lamps ${key(w.lamps[0])} and ${key(w.lamps[1])} nearly face each other: their pictures will come out as near-inverses of each other.`;
    case "crowded":
      return `Lamps ${key(w.lamps[0])} and ${key(w.lamps[1])} are only ${String(Math.round(w.apart))}° apart: pictures cross-fade over about ±25°, so these two will bleed into each other.`;
    case "ghosts":
      return `With ${String(w.count)} lamps, every picture leaves faint negative ghosts under the others. Two lamps 90° apart separate best.`;
    case "high":
      return `Lamp ${key(w.lamp)} is above 40°: from that high, pictures wash out.`;
  }
}

/**
 * "Hide your own images": choose 2–4 lamps, a picture for each (sample, upload or text), and
 * where each lamp stands. A quick half-resolution solve previews every change; "Solve the
 * surface" solves it in full on the stage. Projects save and load as JSON files.
 */
export function Editor() {
  const draft = useAppStore((s) => s.draft);
  const preview = useAppStore((s) => s.preview);
  const updateDraft = useAppStore((s) => s.updateDraft);
  const commitDraft = useAppStore((s) => s.commitDraft);
  const setProject = useAppStore((s) => s.setProject);
  const [status, setStatus] = useState("");

  const lamps = useMemo(() => stageLamps(draft), [draft]);
  const warnings = useMemo(() => layoutWarnings(draft?.lamps ?? []), [draft]);
  const report =
    preview.report && preview.report.length === draft?.lamps.length ? preview.report : null;

  const loadFile = async (file: File) => {
    try {
      setProject(parseProject(await file.text()), null);
      setStatus(`Loaded ${file.name}. Solving the surface…`);
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    } catch (error) {
      setStatus(error instanceof ProjectError ? error.message : `${file.name} could not be read.`);
    }
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    const file = event.dataTransfer.files[0];
    if (!file || !(file.name.endsWith(".json") || file.type === "application/json")) return;
    event.preventDefault();
    void loadFile(file);
  };

  if (!draft) {
    return (
      <section aria-labelledby="editor-title">
        <div className="section-head">
          <span className="eyebrow">Your pictures</span>
          <h2 id="editor-title">Hide your own images</h2>
          <p className="muted">Preparing the sample pictures…</p>
        </div>
      </section>
    );
  }

  const keys = LAMP_KEYS.slice(0, draft.lamps.length);
  const previewNote =
    preview.status === "solving"
      ? "Preview solving…"
      : preview.status === "unavailable"
        ? "Preview unavailable in this browser"
        : `Preview: ${String(draft.n / 2)} × ${String(draft.n / 2)} cells, ${String(PREVIEW_ITERATIONS)} steps`;

  return (
    <section
      aria-labelledby="editor-title"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={onDrop}
    >
      <div className="section-head">
        <span className="eyebrow">Your pictures</span>
        <h2 id="editor-title">Hide your own images</h2>
        <p className="muted">
          Give each lamp a picture and a place around the ring, then solve. Strong shapes and high
          contrast survive best; portraits work when the face fills the frame. A quick preview
          re-solves every change at half resolution. Nothing you add leaves your browser.
        </p>
      </div>

      <div className="editor">
        <div className="editor__layout">
          <LayoutRing
            lamps={lamps}
            warnings={warnings}
            onMove={(index, az) => {
              updateDraft((d) => withLamp(d, index, { az }));
            }}
          />
          <p className="cap" aria-live="polite">
            {previewNote}
          </p>
          {warnings.length === 0 ? (
            <p className="editor__ok">No warnings: this layout should separate cleanly.</p>
          ) : (
            <ul className="editor__warnings">
              {warnings.map((w) => (
                <li key={JSON.stringify(w)}>{warningText(w)}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="editor__lamps">
          {draft.lamps.map((lamp, i) => (
            <LampCard
              key={keys[i] ?? i}
              index={i}
              lampKey={keys[i] ?? String(i + 1)}
              keys={keys}
              lamp={lamp}
              n={draft.n}
              boundary={draft.params.boundary}
              preview={preview.field}
              report={report?.[i]}
              canRemove={draft.lamps.length > MIN_LAMPS}
              onChange={(patch) => {
                updateDraft((d) => withLamp(d, i, patch));
              }}
              onRemove={() => {
                updateDraft((d) => withoutLamp(d, i));
              }}
              onStatus={setStatus}
            />
          ))}
          {draft.lamps.length < MAX_LAMPS && (
            <button
              type="button"
              className="btn editor__add"
              onClick={() => {
                const sample = unusedSample(draft);
                void loadSampleTargets(draft.n).then((targets) => {
                  const target = targets[sample];
                  if (target) {
                    updateDraft((d) =>
                      withAddedLamp(d, { source: { kind: "sample", sample }, target }),
                    );
                  }
                });
              }}
            >
              Add a lamp
            </button>
          )}
        </div>
      </div>

      <div className="row editor__actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            commitDraft();
            setStatus("Solving the surface…");
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
          }}
        >
          Solve the surface
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            void samplePreset("two", draft.n).then((preset) => {
              updateDraft(() => preset);
              setStatus("Sample pictures restored. Solve to rebuild the surface.");
            });
          }}
        >
          Restore the samples
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([serializeProject(draft)], { type: "application/json" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = FILE_NAME;
            a.click();
            URL.revokeObjectURL(url);
            setStatus(`Saved ${FILE_NAME} to your downloads.`);
          }}
        >
          Save project
        </button>
        <label className="btn editor__load">
          Load project
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void loadFile(file);
            }}
          />
        </label>
        <p className="status" role="status">
          {status}
        </p>
      </div>
    </section>
  );
}
