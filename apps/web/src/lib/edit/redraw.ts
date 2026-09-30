import { cropBitmap, opaqueBox, resizeNearest } from "@/lib/image/bitmap";
import {
  MAX_SNAP_COLORS,
  REDRAW_ALIGN_SLACK,
  REDRAW_KEEP_DISTANCE,
  REDRAW_SNAP_DISTANCE,
} from "./constants";

/**
 * Lines a redrawn picture up with the drawing it replaces (both `w × h`).
 * Image models often draw a few pixels bigger, smaller or off-centre, which
 * would shift every pixel of the art; so when the redrawn drawing's box is
 * only a little off, it is moved and scaled onto the original's box. A clearly
 * different box (a hat added on top) is meant, and stays.
 */
export function alignToOriginal(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8ClampedArray {
  const from = opaqueBox({ rgba: after, w, h });
  const to = opaqueBox({ rgba: before, w, h });
  if (!from || !to) return after;
  const off = (a: number, b: number, size: number) =>
    Math.abs(a - b) > size * REDRAW_ALIGN_SLACK;
  if (
    off(from.x, to.x, to.w) ||
    off(from.y, to.y, to.h) ||
    off(from.w, to.w, to.w) ||
    off(from.h, to.h, to.h)
  )
    return after;
  const fitted = resizeNearest(
    cropBitmap({ rgba: after, w, h }, from),
    to.w,
    to.h,
  );
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < to.h; y++) {
    const row = fitted.rgba.subarray(y * to.w * 4, (y + 1) * to.w * 4);
    out.set(row, ((to.y + y) * w + to.x) * 4);
  }
  return out;
}

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

type Color = [number, number, number];

/** The colours of the opaque pixels, most used first, at most `limit`. */
export function paletteOf(
  pixels: Uint8ClampedArray,
  limit = MAX_SNAP_COLORS,
): Color[] {
  const counts = new Map<number, number>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const key = (pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => [(key >> 16) & 255, (key >> 8) & 255, key & 255]);
}

/**
 * A redrawn picture in the colours of the art it changes: a pixel close to
 * one of `palette` takes that colour exactly, so the untouched parts keep
 * their look instead of being repainted in slightly different shades; clearly
 * new colours (a yellow banana in a dark scene) stay as they are.
 */
export function snapToPalette(
  pixels: Uint8ClampedArray,
  palette: Color[],
  maxDistance = REDRAW_SNAP_DISTANCE,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  if (!palette.length) return out;
  for (let i = 0; i < out.length; i += 4) {
    if (!out[i + 3]) continue;
    let best = palette[0]!;
    let bestDistance = Infinity;
    for (const color of palette) {
      const d = Math.hypot(
        out[i]! - color[0],
        out[i + 1]! - color[1],
        out[i + 2]! - color[2],
      );
      if (d < bestDistance) [best, bestDistance] = [color, d];
    }
    if (bestDistance <= maxDistance) out.set(best, i);
  }
  return out;
}
