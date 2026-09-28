import { MAX_OBJECTS, MIN_OBJECT_PIXELS } from "./constants";
import type { Rect } from "./raster";

type Component = { box: Rect; members: number[] };

/** Groups touching opaque pixels (diagonals too) into separate drawn things. */
function components(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Component[] {
  const seen = new Uint8Array(width * height);
  const out: Component[] = [];
  const opaque = (i: number) => (pixels[i * 4 + 3] ?? 0) > 0;
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || !opaque(start)) continue;
    const members: number[] = [];
    const stack = [start];
    seen[start] = 1;
    let [x0, y0, x1, y1] = [width, height, -1, -1];
    for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
      members.push(i);
      const x = i % width;
      const y = (i - x) / width;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (!seen[n] && opaque(n)) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
    out.push({
      box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 },
      members,
    });
  }
  return out;
}

/** Boxes of the drawn things on the tile, biggest first, specks left out. */
export function findObjects(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Rect[] {
  return components(pixels, width, height)
    .filter((c) => c.members.length >= MIN_OBJECT_PIXELS)
    .sort((a, b) => b.members.length - a.members.length)
    .slice(0, MAX_OBJECTS)
    .map((c) => c.box);
}

const inside = (a: Rect, b: Rect) =>
  a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/**
 * Erases the drawn things lying fully inside `area`, and nothing else, so a
 * moved or resized object leaves no copy behind while its neighbours stay.
 */
export function clearObjectsInside(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  area: Rect,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  for (const c of components(pixels, width, height)) {
    if (!inside(c.box, area)) continue;
    for (const i of c.members) out.fill(0, i * 4, i * 4 + 4);
  }
  return out;
}
