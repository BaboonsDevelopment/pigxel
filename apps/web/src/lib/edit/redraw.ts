import { REDRAW_KEEP_DISTANCE } from "./constants";

/**
 * Combines an area before and after the AI redrew it: pixels the AI left
 * (almost) the same keep their exact original colour, so re-quantising the
 * picture does not repaint the whole area; real changes come through,
 * including pixels the AI erased.
 */
export function mergeRedraw(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(after);
  for (let i = 0; i < out.length; i += 4) {
    const wasOpaque = (before[i + 3] ?? 0) > 0;
    const isOpaque = (after[i + 3] ?? 0) > 0;
    if (wasOpaque !== isOpaque) continue;
    const distance = Math.hypot(
      (before[i] ?? 0) - (after[i] ?? 0),
      (before[i + 1] ?? 0) - (after[i + 1] ?? 0),
      (before[i + 2] ?? 0) - (after[i + 2] ?? 0),
    );
    if (!isOpaque || distance <= REDRAW_KEEP_DISTANCE) {
      out.set(before.subarray(i, i + 4), i);
    }
  }
  return out;
}
