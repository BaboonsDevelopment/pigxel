import type { Size } from "./constants";
import type { Rgba } from "./paint";

export function outlined(
  pixels: Uint8ClampedArray,
  size: Size,
  rgba: Rgba,
  mask: Uint8Array | null,
  corners = false,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  const drawn = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < size.w &&
    y < size.h &&
    pixels[(y * size.w + x) * 4 + 3]! > 0;
  const around = corners
    ? [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy] as const))
    : ([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const);
  for (let y = 0; y < size.h; y++)
    for (let x = 0; x < size.w; x++) {
      const i = y * size.w + x;
      if (drawn(x, y) || (mask && !mask[i])) continue;
      if (around.some(([dx, dy]) => drawn(x + dx, y + dy)))
        out.set(rgba, i * 4);
    }
  return out;
}

export function replacedColor(
  pixels: Uint8ClampedArray,
  from: Rgba,
  to: Rgba,
  mask: Uint8Array | null,
  tolerance = 0,
  keepShading = false,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < pixels.length / 4; i++) {
    if (mask && !mask[i]) continue;
    const p = i * 4;
    if (!pixels[p + 3] && from[3]) continue;
    let matches = true;
    for (let c = 0; c < 4; c++)
      if (Math.abs(pixels[p + c]! - from[c]!) > tolerance) matches = false;
    if (!matches) continue;
    if (!keepShading) {
      out.set(to, p);
      continue;
    }
    for (let c = 0; c < 4; c++) out[p + c] = pixels[p + c]! + to[c]! - from[c]!;
  }
  return out;
}

export function filledMask(
  rgba: Uint8ClampedArray,
  mask: Uint8Array,
  color: readonly [number, number, number, number],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  for (let i = 0; i < mask.length; i++) if (mask[i]) out.set(color, i * 4);
  return out;
}
