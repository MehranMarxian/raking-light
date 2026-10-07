import { useEffect } from "react";
import { DEFAULTS } from "../core/defaults";
import { SAMPLE_LAYOUTS } from "../core/layouts";
import { nearestLampIndex } from "../render/stage/lamp";
import { sweepAngle, sweepStartTime } from "../render/stage/sweep";
import { useAppStore } from "../state/store";

/**
 * While sweeping, carries the lamp around the ring once per frame: it rests on each picture,
 * then glides clockwise to the next. It starts from the lamp nearest to where the lamp is now,
 * and brings a lamp that is too high for clear pictures back down to the solve elevation.
 */
export function useSweep(): void {
  const sweeping = useAppStore((s) => s.sweeping);
  const mode = useAppStore((s) => s.mode);

  useEffect(() => {
    if (!sweeping) return;
    const azimuths = SAMPLE_LAYOUTS[mode].map((l) => l.az);
    const { lamp, setLamp } = useAppStore.getState();
    if (lamp.el > 40) setLamp({ el: DEFAULTS.solveElevation });
    const start = performance.now() - sweepStartTime(nearestLampIndex(lamp.az, azimuths) ?? 0);

    let frame = requestAnimationFrame(function tick(now) {
      setLamp({ az: sweepAngle(now - start, azimuths) });
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [sweeping, mode]);
}
