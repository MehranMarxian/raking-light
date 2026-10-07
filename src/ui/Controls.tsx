import { formatAz } from "../render/stage/lamp";
import { useAppStore } from "../state/store";
import { LampLabel, LampReading } from "./LampText";
import { LAYOUT_LAMPS } from "./layoutLamps";
import "./Controls.css";

const FLAT_EL = 90;

/** The prototype's controls: layout, lamp height, sweep, flat light, one button per picture. */
export function Controls() {
  const mode = useAppStore((s) => s.mode);
  const { az, el } = useAppStore((s) => s.lamp);
  const sweeping = useAppStore((s) => s.sweeping);
  const setMode = useAppStore((s) => s.setMode);
  const setLamp = useAppStore((s) => s.setLamp);
  const moveLamp = useAppStore((s) => s.moveLamp);
  const setSweeping = useAppStore((s) => s.setSweeping);
  const elRounded = Math.round(el);

  return (
    <div className="controls">
      <div className="row" role="group" aria-label="Number of hidden pictures">
        <span className="cap">Hidden pictures</span>
        <button
          type="button"
          className="btn"
          aria-pressed={mode === "two"}
          onClick={() => {
            if (mode !== "two") setMode("two");
          }}
        >
          Two
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={mode === "three"}
          onClick={() => {
            if (mode !== "three") setMode("three");
          }}
        >
          Three
        </button>
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
        {LAYOUT_LAMPS[mode].map((lamp) => (
          <button
            key={lamp.pic.key}
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
          <LampReading az={az} el={el} mode={mode} />
        </span>
      </p>
    </div>
  );
}
