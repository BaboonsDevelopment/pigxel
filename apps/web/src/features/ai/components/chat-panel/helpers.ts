import type { Area, Size } from "@/features/editor/pixel-canvas/constants";
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

export const emptyCel = (size: Size): Uint8ClampedArray =>
  new Uint8ClampedArray(size.w * size.h * 4);

export const paint = (
  cel: Uint8ClampedArray,
  size: Size,
  art: Uint8ClampedArray,
  area: Area,
) => drawOnEmpty(cel, size.w, art, area);

export const drawnBox = (cel: Uint8ClampedArray, size: Size): Area | null =>
  opaqueBox({ rgba: cel, ...size });

export function opaqueIn(
  cel: Uint8ClampedArray,
  size: Size,
  area: Area,
): number {
  let n = 0;
  for (let y = area.y; y < area.y + area.h; y++)
    for (let x = area.x; x < area.x + area.w; x++)
      if (cel[(y * size.w + x) * 4 + 3]) n++;
  return n;
}

export function replaceArea(
  cel: Uint8ClampedArray,
  size: Size,
  art: Bitmap,
  area: Area,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(cel);
  for (let y = 0; y < area.h; y++)
    out.set(
      art.rgba.subarray(y * area.w * 4, (y + 1) * area.w * 4),
      ((area.y + y) * size.w + area.x) * 4,
    );
  return out;
}

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

export function samePixels(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

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
