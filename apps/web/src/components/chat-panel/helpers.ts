import type { Area, Size } from "@/components/pixel-canvas/constants";
import {
  drawOnEmpty,
  keepMasked,
  liftObjectsInside,
  neighbourMask,
  objectMask,
} from "@/lib/edit/objects";
import { applyOps, parseOps } from "@/lib/edit/ops";
import { mergeRedraw } from "@/lib/edit/redraw";
import { cropBitmap, opaqueBox, type Bitmap } from "@/lib/image/bitmap";

/**
 * Pure changes to a cel (full-tile RGBA of `size`) that the AI flows make:
 * each takes the cel as it is and returns it changed, so the flows decide
 * which cels to change and write them all back as one undo step.
 */

/** An empty cel. */
export const emptyCel = (size: Size): Uint8ClampedArray =>
  new Uint8ClampedArray(size.w * size.h * 4);

/** `cel` with `art` (an `area`-sized picture) painted where it is empty. */
export const paint = (
  cel: Uint8ClampedArray,
  size: Size,
  art: Uint8ClampedArray,
  area: Area,
) => drawOnEmpty(cel, size.w, art, area);

/** The box around what is drawn on a cel, or null when it is empty. */
export const drawnBox = (cel: Uint8ClampedArray, size: Size): Area | null =>
  opaqueBox({ rgba: cel, ...size });

/**
 * Pixels an edit of `area` may not change: neighbours reaching into it and
 * the objects the plan said to keep.
 */
function protectedMask(
  cel: Uint8ClampedArray,
  size: Size,
  area: Area,
  keep: Area[],
) {
  const mask = neighbourMask(cel, size.w, size.h, area);
  objectMask(cel, size.w, size.h, keep).forEach((k, i) => k && (mask[i] = 1));
  return mask;
}

/**
 * Runs a precise edit's operations inside `area`; drawings that only reach
 * into it (a neighbour's edge) and the objects in `keep` stay as they are.
 */
export function applyEdit(
  cel: Uint8ClampedArray,
  size: Size,
  edit: { ops: string[]; palette: Record<string, string> },
  area: Area,
  keep: Area[],
): { cel: Uint8ClampedArray; applied: number } {
  const { ops } = parseOps(edit.ops);
  const result = applyOps(cel, size.w, ops, edit.palette, area);
  const mask = protectedMask(cel, size, area, keep);
  return { cel: keepMasked(cel, result.pixels, mask), applied: result.applied };
}

/** Puts a redrawn picture of `area` back, changing only what differs. */
export function applyRedraw(
  cel: Uint8ClampedArray,
  size: Size,
  art: Bitmap,
  area: Area,
  keep: Area[],
): Uint8ClampedArray {
  const after = new Uint8ClampedArray(cel);
  const current = cropBitmap({ rgba: cel, ...size }, area).rgba;
  const merged = mergeRedraw(current, art.rgba);
  for (let y = 0; y < area.h; y++) {
    const row = merged.subarray(y * area.w * 4, (y + 1) * area.w * 4);
    after.set(row, ((area.y + y) * size.w + area.x) * 4);
  }
  return keepMasked(cel, after, protectedMask(cel, size, area, keep));
}

/**
 * Takes the drawings lying fully inside `source` off the cel and paints
 * `art` into `target` instead, never over other drawings: a redrawn object
 * that moved or changed size.
 */
export function replaceObject(
  cel: Uint8ClampedArray,
  size: Size,
  art: Bitmap,
  source: Area,
  target: Area,
): Uint8ClampedArray {
  const { rest } = liftObjectsInside(cel, size.w, size.h, source);
  return paint(rest, size, art.rgba, target);
}

/** Moves the drawings inside `source` so its corner lands on `to`, pixel for pixel. */
export function moveObject(
  cel: Uint8ClampedArray,
  size: Size,
  source: Area,
  to: { x: number; y: number },
): Uint8ClampedArray {
  const { rest, lifted } = liftObjectsInside(cel, size.w, size.h, source);
  const x = Math.max(0, Math.min(size.w - source.w, to.x));
  const y = Math.max(0, Math.min(size.h - source.h, to.y));
  return paint(rest, size, lifted, { x, y, w: source.w, h: source.h });
}

/** Copies the drawings inside `source` into each of `targets`, on empty pixels. */
export function copyObject(
  cel: Uint8ClampedArray,
  size: Size,
  source: Area,
  targets: Area[],
): Uint8ClampedArray {
  const { lifted } = liftObjectsInside(cel, size.w, size.h, source);
  return targets.reduce(
    (pixels, t) =>
      paint(pixels, size, lifted, { ...t, w: source.w, h: source.h }),
    cel,
  );
}

/**
 * Where `area` goes when `source` is moved and resized into `target`: the
 * same shift and scale, kept inside the tile. Lets an edit planned on the
 * frame on screen carry over to the same drawing in other frames.
 */
export function follow(
  area: Area,
  source: Area,
  target: Area,
  size: Size,
): Area {
  const kx = target.w / source.w;
  const ky = target.h / source.h;
  const w = Math.max(1, Math.min(size.w, Math.round(area.w * kx)));
  const h = Math.max(1, Math.min(size.h, Math.round(area.h * ky)));
  const x = Math.round(target.x + (area.x - source.x) * kx);
  const y = Math.round(target.y + (area.y - source.y) * ky);
  return {
    x: Math.max(0, Math.min(size.w - w, x)),
    y: Math.max(0, Math.min(size.h - h, y)),
    w,
    h,
  };
}

/** Whether two cels hold exactly the same pixels. */
export function samePixels(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** `area` grown by `margin` on every side, kept inside the tile. */
export function grown(area: Area, margin: number, size: Size): Area {
  const x = Math.max(0, area.x - margin);
  const y = Math.max(0, area.y - margin);
  return {
    x,
    y,
    w: Math.min(size.w, area.x + area.w + margin) - x,
    h: Math.min(size.h, area.y + area.h + margin) - y,
  };
}

/**
 * The frames of an animation side by side, one tile pixel of `divider`
 * between them. `layers` holds each layer's cels by frame, bottom layer
 * first; a frame shows them stacked.
 */
export function frameStrip(
  layers: (Uint8ClampedArray | null)[][],
  frameCount: number,
  size: Size,
  divider: [number, number, number],
): Bitmap {
  const w = (size.w + 1) * frameCount - 1;
  const strip = { rgba: new Uint8ClampedArray(w * size.h * 4), w, h: size.h };
  for (let f = 0; f < frameCount; f++) {
    const left = f * (size.w + 1);
    for (let y = 0; y < size.h; y++) {
      if (f) strip.rgba.set([...divider, 255], (y * strip.w + left - 1) * 4);
      for (const cels of layers) {
        const cel = cels[f];
        if (!cel) continue;
        for (let x = 0; x < size.w; x++) {
          const i = (y * size.w + x) * 4;
          if (cel[i + 3])
            strip.rgba.set(
              cel.subarray(i, i + 4),
              (y * strip.w + left + x) * 4,
            );
        }
      }
    }
  }
  return strip;
}
