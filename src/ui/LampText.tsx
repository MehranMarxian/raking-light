import { readLamp } from "../render/stage/lamp";
import type { StageLamp } from "./stageLamps";

/** A picture's name, isolated so right-to-left names sit correctly in left-to-right text. */
export function PictureName({ name, lang }: { name: string; lang?: string | undefined }) {
  return <bdi lang={lang}>{name}</bdi>;
}

/** "A · Crescent" */
export function LampLabel({ lamp }: { lamp: StageLamp }) {
  return (
    <>
      {lamp.key} · <PictureName name={lamp.name} lang={lamp.lang} />
    </>
  );
}

/** What the stage shows with the lamp at (az, el), in the prototype's words. */
export function LampReading({
  az,
  el,
  lamps,
}: {
  az: number;
  el: number;
  lamps: readonly StageLamp[];
}) {
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
