import type { Picture } from "../core/layouts";
import { readLamp } from "../render/stage/lamp";
import type { Mode } from "../state/store";
import { LAYOUT_LAMPS, type StageLamp } from "./layoutLamps";

export function PictureName({ pic }: { pic: Picture }) {
  return <bdi lang={pic.lang}>{pic.name}</bdi>;
}

/** "A · Crescent" */
export function LampLabel({ lamp }: { lamp: StageLamp }) {
  return (
    <>
      {lamp.pic.key} · <PictureName pic={lamp.pic} />
    </>
  );
}

/** What the stage shows with the lamp at (az, el), in the prototype's words. */
export function LampReading({ az, el, mode }: { az: number; el: number; mode: Mode }) {
  const lamps = LAYOUT_LAMPS[mode];
  const reading = readLamp(
    az,
    el,
    lamps.map((l) => l.az),
  );
  switch (reading.kind) {
    case "flat":
      return <>Flat light · the surface reads as noise</>;
    case "too-high":
      return <>Lamp too high for clear pictures</>;
    case "between":
      return <>Between lamps · pictures cross-fade</>;
    case "lamp": {
      const lamp = lamps[reading.index];
      return lamp ? (
        <>
          Lamp <LampLabel lamp={lamp} />
        </>
      ) : null;
    }
  }
}
