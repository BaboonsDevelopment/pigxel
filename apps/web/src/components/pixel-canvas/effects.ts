import type { Size } from "./constants";
import type { Rgba } from "./paint";

/**
 * Whole-cel changes from the Edit menu. Each takes the cel's RGBA and
 * returns a changed copy, touching only pixels in `mask` when there is one.
 */

/**
 * Draws a 1px outline in `rgba` around everything drawn: every transparent
 * pixel next to a drawn one (sideways, or also diagonally with `corners`).
 */
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

/** Repaints every pixel of colour `from` (alpha ignored when both are opaque) in `to`. */
export function replacedColor(
  pixels: Uint8ClampedArray,
  from: Rgba,
  to: Rgba,
  mask: Uint8Array | null,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < pixels.length / 4; i++) {
    if (mask && !mask[i]) continue;
    const p = i * 4;
    if (
      pixels[p] === from[0] &&
      pixels[p + 1] === from[1] &&
      pixels[p + 2] === from[2] &&
      pixels[p + 3] === from[3]
    )
      out.set(to, p);
  }
  return out;
}
