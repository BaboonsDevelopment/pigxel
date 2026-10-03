import type { Rect, Slice } from "@/lib/slices/slices";

/**
 * Turning or mirroring the whole tile, as Aseprite's Sprite › Rotate Canvas
 * and Flip Canvas: every layer and frame at once.
 */
export type TileTransform =
  | "flipHorizontal"
  | "flipVertical"
  | "rotateRight"
  | "rotateLeft"
  | "rotate180";

/** Whether the transform swaps the width and height. */
export const turnsSideways = (t: TileTransform) =>
  t === "rotateRight" || t === "rotateLeft";

/** Where pixel (x, y) of a `w × h` picture ends up. */
function moved(t: TileTransform, x: number, y: number, w: number, h: number) {
  switch (t) {
    case "flipHorizontal":
      return { x: w - 1 - x, y };
    case "flipVertical":
      return { x, y: h - 1 - y };
    case "rotateRight":
      return { x: h - 1 - y, y: x };
    case "rotateLeft":
      return { x: y, y: w - 1 - x };
    case "rotate180":
      return { x: w - 1 - x, y: h - 1 - y };
  }
}

/** A `w × h` picture turned or mirrored; its size swaps for a quarter turn. */
export function transformPixels(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  t: TileTransform,
): { rgba: Uint8ClampedArray; w: number; h: number } {
  const [nw, nh] = turnsSideways(t) ? [h, w] : [w, h];
  const out = new Uint8ClampedArray(rgba.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const to = moved(t, x, y, w, h);
      const from = (y * w + x) * 4;
      out.set(rgba.subarray(from, from + 4), (to.y * nw + to.x) * 4);
    }
  return { rgba: out, w: nw, h: nh };
}

/** A rectangle inside a `w × h` area, turned or mirrored with it. */
function transformRect(r: Rect, w: number, h: number, t: TileTransform): Rect {
  const a = moved(t, r.x, r.y, w, h);
  const b = moved(t, r.x + r.w - 1, r.y + r.h - 1, w, h);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 };
}

/** Slices turned or mirrored with a `w × h` tile, their centre and pivot too. */
export function transformSlices(
  slices: Slice[],
  w: number,
  h: number,
  t: TileTransform,
): Slice[] {
  return slices.map((slice) => {
    const { w: bw, h: bh } = slice.bounds;
    return {
      ...slice,
      bounds: transformRect(slice.bounds, w, h, t),
      // The centre and pivot are relative to the bounds, which turn too.
      center: slice.center && transformRect(slice.center, bw, bh, t),
      pivot: slice.pivot && moved(t, slice.pivot.x, slice.pivot.y, bw, bh),
    };
  });
}
