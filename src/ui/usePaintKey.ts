import { useAppStore } from "../state/store";

/** How often the still images (plates, height map) follow a running solve. */
const EVERY = 25;

/**
 * A key that changes when the still images should be repainted: when a field first appears,
 * every 25 iterations of a solve, and when it finishes. As in the prototype.
 */
export function usePaintKey(): string {
  return useAppStore((s) => {
    const { status, iteration } = s.solve;
    const step = status === "done" ? "done" : String(Math.floor(iteration / EVERY));
    return `${s.heights ? "field" : "none"}:${step}`;
  });
}
