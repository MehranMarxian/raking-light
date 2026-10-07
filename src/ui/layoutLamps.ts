import { SAMPLE_LAYOUTS, SAMPLE_PICTURES, type Picture } from "../core/layouts";
import type { Mode } from "../state/store";

export interface StageLamp {
  pic: Picture;
  az: number;
  el: number;
}

function withPictures(mode: Mode): StageLamp[] {
  return SAMPLE_LAYOUTS[mode].flatMap(({ picture, az, el }) => {
    const pic = SAMPLE_PICTURES[picture];
    return pic ? [{ pic, az, el }] : [];
  });
}

/** Each mode's lamps, with the picture each one shows. */
export const LAYOUT_LAMPS: Record<Mode, readonly StageLamp[]> = {
  two: withPictures("two"),
  three: withPictures("three"),
};
