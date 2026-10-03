import { MAX_OBJECTS, MIN_OBJECT_PIXELS } from "./constants";
import { sameRect, type Rect } from "./raster";

export type Component = { box: Rect; members: number[] };

export function components(
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

export function liftObjectsInside(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  area: Rect,
): { rest: Uint8ClampedArray; lifted: Uint8ClampedArray } {
  const rest = new Uint8ClampedArray(pixels);
  const lifted = new Uint8ClampedArray(area.w * area.h * 4);
  for (const c of components(pixels, width, height)) {
    if (!inside(c.box, area)) continue;
    for (const i of c.members) {
      const x = (i % width) - area.x;
      const y = Math.floor(i / width) - area.y;
      lifted.set(pixels.subarray(i * 4, i * 4 + 4), (y * area.w + x) * 4);
      rest.fill(0, i * 4, i * 4 + 4);
    }
  }
  return { rest, lifted };
}

export function neighbourMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  area: Rect,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const touches = (b: Rect) =>
    b.x < area.x + area.w &&
    b.x + b.w > area.x &&
    b.y < area.y + area.h &&
    b.y + b.h > area.y;
  for (const c of components(pixels, width, height)) {
    if (inside(c.box, area) || !touches(c.box)) continue;
    for (const i of c.members) mask[i] = 1;
  }
  return mask;
}

export function keepMasked(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  mask: Uint8Array,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(after);
  mask.forEach((keep, i) => {
    if (keep) out.set(before.subarray(i * 4, i * 4 + 4), i * 4);
  });
  return out;
}

export function drawOnEmpty(
  tile: Uint8ClampedArray,
  width: number,
  art: Uint8ClampedArray,
  area: Rect,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tile);
  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      const from = (y * area.w + x) * 4;
      const to = ((area.y + y) * width + area.x + x) * 4;
      if (art[from + 3] && !out[to + 3]) {
        out.set(art.subarray(from, from + 4), to);
      }
    }
  }
  return out;
}

export function objectMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  boxes: Rect[],
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const listed = (b: Rect) => boxes.some((r) => sameRect(r, b));
  for (const c of components(pixels, width, height)) {
    if (!listed(c.box)) continue;
    for (const i of c.members) mask[i] = 1;
  }
  return mask;
}
