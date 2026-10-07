import { formatAz } from "../render/stage/lamp";
import { useAppStore } from "../state/store";
import { LampLabel, LampReading } from "./LampText";
import type { SampleLayoutId } from "../core/layouts";
import { samplePreset } from "../render/samples";
import { useStageLamps } from "./stageLamps";
import "./Controls.css";

const FLAT_EL = 90;

const PRESETS: { id: SampleLayoutId; label: string }[] = [
  { id: "two", label: "Two" },
  { id: "three", label: "Three" },
];

/** The prototype's controls: sample layout, lamp height, sweep, flat light, one button per picture. */
export function Controls() {
  const presetId = useAppStore((s) => s.presetId);
  const lamps = useStageLamps();
  const { az, el } = useAppStore((s) => s.lamp);
  const sweeping = useAppStore((s) => s.sweeping);
  const setProject = useAppStore((s) => s.setProject);
  const setLamp = useAppStore((s) => s.setLamp);
  const moveLamp = useAppStore((s) => s.moveLamp);
  const setSweeping = useAppStore((s) => s.setSweeping);
  const elRounded = Math.round(el);

  return (
    <div className="controls">
      <div className="row" role="group" aria-label="Number of hidden pictures">
        <span className="cap">Hidden pictures</span>
        {PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="btn"
            aria-pressed={presetId === id}
            onClick={() => {
              if (presetId === id) return;
              void samplePreset(id).then((preset) => {
                setProject(preset, id);
              });
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="slider">
        <label htmlFor="lamp-height">Lamp height</label>
        <input
          id="lamp-height"
          type="range"
          min={4}
          max={90}
          step={1}
          value={elRounded}
          onChange={(event) => {
            setLamp({ el: Number(event.target.value) });
          }}
        />
        <span className="cap">{elRounded}°</span>
      </div>

      <div className="row">
        <button
          type="button"
          className="btn"
          aria-pressed={sweeping}
          onClick={() => {
            setSweeping(!sweeping);
          }}
        >
          Sweep the lamp
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            moveLamp({ el: FLAT_EL });
          }}
        >
          Flat light
        </button>
      </div>

      <div className="row" role="group" aria-label="Show a picture">
        {lamps.map((lamp) => (
          <button
            key={lamp.key}
            type="button"
            className="btn"
            onClick={() => {
              moveLamp({ az: lamp.az, el: lamp.el });
            }}
          >
            <LampLabel lamp={lamp} />
          </button>
        ))}
      </div>

      <p className="readout">
        <span>
          AZ <b>{formatAz(az)}</b>
        </span>
        <span>
          EL <b>{elRounded}°</b>
        </span>
        <span>
          <LampReading az={az} el={el} lamps={lamps} />
        </span>
      </p>
    </div>
  );
}
