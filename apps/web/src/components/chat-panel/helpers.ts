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
import type { Bitmap } from "@/lib/image/bitmap";
import { imageToPixelArt } from "@/lib/image/helpers";
import { GENERATED_PICTURE_STEPS } from "@/lib/image/pipeline";

/**
 * Pure changes to a cel (full-tile RGBA of `size`) that the AI flows make:
 * each takes the cel as it is and returns it changed, so the flows decide
 * which cels to change and write them all back as one undo step.
 */

/** A picture from the AI (a data URL), turned into pixel art at the area's size. */
export async function toArt(dataUrl: string, area: Size): Promise<Bitmap> {
  const image = await (await fetch(dataUrl)).blob();
  return imageToPixelArt(image, area.w, area.h, GENERATED_PICTURE_STEPS);
}

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
export function drawnBox(cel: Uint8ClampedArray, size: Size): Area | null {
  let [x0, y0, x1, y1] = [size.w, size.h, -1, -1];
  for (let i = 3, p = 0; i < cel.length; i += 4, p++) {
    if (!cel[i]) continue;
    const x = p % size.w;
    const y = (p - x) / size.w;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

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
  const current = new Uint8ClampedArray(area.w * area.h * 4);
  for (let y = 0; y < area.h; y++) {
    const from = ((area.y + y) * size.w + area.x) * 4;
    current.set(cel.subarray(from, from + area.w * 4), y * area.w * 4);
  }
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

/** The box around every given area, or null when there are none. */
export function unionOf(areas: Area[]): Area | null {
  if (!areas.length) return null;
  const x = Math.min(...areas.map((a) => a.x));
  const y = Math.min(...areas.map((a) => a.y));
  const right = Math.max(...areas.map((a) => a.x + a.w));
  const bottom = Math.max(...areas.map((a) => a.y + a.h));
  return { x, y, w: right - x, h: bottom - y };
}
