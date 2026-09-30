import type { Area, Size } from "@/components/pixel-canvas/constants";
import {
  drawOnEmpty,
  keepMasked,
  liftObjectsInside,
  neighbourMask,
  objectMask,
} from "@/lib/edit/objects";
import { applyOps, parseOps } from "@/lib/edit/ops";
import {
  alignToOriginal,
  mergeRedraw,
  paletteOf,
  snapToPalette,
} from "@/lib/edit/redraw";
import type { Bitmap } from "@/lib/image/bitmap";
import { imageToPixelArt } from "@/lib/image/helpers";
import { GENERATED_PICTURE_STEPS, type Step } from "@/lib/image/pipeline";

/**
 * Pure changes to a cel (full-tile RGBA of `size`) that the AI flows make:
 * each takes the cel as it is and returns it changed, so the flows decide
 * which cels to change and write them all back as one undo step.
 */

/**
 * A picture from the AI (a data URL), turned into pixel art at the area's
 * size: a new picture (cropped to its subject) or a redraw (kept as framed).
 */
export async function toArt(
  dataUrl: string,
  area: Size,
  steps: Step[] = GENERATED_PICTURE_STEPS,
): Promise<Bitmap> {
  const image = await (await fetch(dataUrl)).blob();
  return imageToPixelArt(image, area.w, area.h, steps);
}

/**
 * A picture made smaller (at most `side` pixels a side) as a PNG data URL,
 * so it can be sent back to the AI as a reference. Browser only.
 */
export async function shrinkPicture(
  dataUrl: string,
  side: number,
): Promise<string> {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  try {
    const k = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

/** Whether two areas are the same, or both missing. */
export const sameBox = (a: Area | null, b: Area | null) =>
  a === b ||
  (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

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

/** Which drawn things an edit is about: those it changes and those it keeps. */
export type EditScope = { changing: Area[]; keep: Area[] };

/**
 * Pixels an edit of `area` may not change: neighbours reaching into it and
 * the objects the plan said to keep.
 */
function protectedMask(
  cel: Uint8ClampedArray,
  size: Size,
  area: Area,
  { changing, keep }: EditScope,
) {
  const mask = neighbourMask(cel, size.w, size.h, area, changing);
  objectMask(cel, size.w, size.h, keep).forEach((k, i) => k && (mask[i] = 1));
  return mask;
}

/**
 * Runs a precise edit's operations inside `area`; drawings that only reach
 * into it (a neighbour's edge) and the objects kept stay as they are.
 */
export function applyEdit(
  cel: Uint8ClampedArray,
  size: Size,
  edit: { ops: string[]; palette: Record<string, string> },
  area: Area,
  scope: EditScope,
): { cel: Uint8ClampedArray; applied: number } {
  const { ops } = parseOps(edit.ops);
  const result = applyOps(cel, size.w, ops, edit.palette, area);
  const mask = protectedMask(cel, size, area, scope);
  return { cel: keepMasked(cel, result.pixels, mask), applied: result.applied };
}

/**
 * Puts a redrawn picture of `area` back, in the art's own colours and
 * changing only what differs, and nothing outside `only`.
 */
export function applyRedraw(
  cel: Uint8ClampedArray,
  size: Size,
  art: Bitmap,
  area: Area,
  scope: EditScope,
  only: Area = area,
): Uint8ClampedArray {
  const after = new Uint8ClampedArray(cel);
  const current = new Uint8ClampedArray(area.w * area.h * 4);
  for (let y = 0; y < area.h; y++) {
    const from = ((area.y + y) * size.w + area.x) * 4;
    current.set(cel.subarray(from, from + area.w * 4), y * area.w * 4);
  }
  const redrawn = snapToPalette(
    alignToOriginal(current, art.rgba, area.w, area.h),
    paletteOf(cel),
  );
  const merged = mergeRedraw(current, redrawn);
  for (let y = 0; y < area.h; y++) {
    const row = merged.subarray(y * area.w * 4, (y + 1) * area.w * 4);
    after.set(row, ((area.y + y) * size.w + area.x) * 4);
  }
  const mask = protectedMask(cel, size, area, scope);
  for (let y = 0; y < size.h; y++)
    for (let x = 0; x < size.w; x++)
      if (
        x < only.x ||
        y < only.y ||
        x >= only.x + only.w ||
        y >= only.y + only.h
      )
        mask[y * size.w + x] = 1;
  return keepMasked(cel, after, mask);
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
  return paint(rest, size, snapToPalette(art.rgba, paletteOf(cel)), target);
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

/** Whether two cels hold exactly the same pixels. */
export function samePixels(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
