import { REDRAW_KEEP_DISTANCE } from "./constants";

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
