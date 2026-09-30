import type { Size } from "./constants";
import type { Point, TipRect } from "./pen";

/** Which mirror copies a stroke also paints, across the tile's middle. */
export type Symmetry = "none" | "horizontal" | "vertical" | "both";

/** Which edges the tile wraps around, so it repeats seamlessly (Aseprite's tiled mode). */
export type TiledMode = "none" | "x" | "y" | "both";

/** An RGBA colour; alpha 0 erases to transparency. */
export type Rgba = readonly [number, number, number, number];

/**
 * What a painted pixel becomes: a colour, or a colour worked out from the
 * pixel (by its index on the tile), e.g. shading; null leaves it alone.
 */
export type Ink = Rgba | ((index: number) => Rgba | null);

export type PaintOptions = {
  size: Size;
  symmetry: Symmetry;
  tiled: TiledMode;
  /** One byte per tile pixel; when given, only pixels set here change. */
  mask: Uint8Array | null;
  /** How much of the area is painted, in % (100 when missing); less makes an ordered dither. */
  density?: number;
};

/** The 4×4 ordered (Bayer) dither: a pixel is painted when its value is under density × 16. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Whether a dither of `density` % paints the tile pixel (x, y). */
export function inPattern(x: number, y: number, density = 100) {
  return density >= 100 || BAYER[y & 3]![x & 3]! < (density / 100) * 16;
}

const mod = (value: number, n: number) => ((value % n) + n) % n;

/**
 * Where a tile pixel lands, or null when it falls off the tile: off-tile
 * pixels wrap around in tiled mode and are dropped otherwise.
 */
export function wrapPixel(
  x: number,
  y: number,
  size: Size,
  tiled: TiledMode,
): Point | null {
  const wrapX = tiled === "x" || tiled === "both";
  const wrapY = tiled === "y" || tiled === "both";
  const px = wrapX ? mod(x, size.w) : x;
  const py = wrapY ? mod(y, size.h) : y;
  if (px < 0 || py < 0 || px >= size.w || py >= size.h) return null;
  return { x: px, y: py };
}

/** `point` and its mirror copies for `symmetry`, around the tile's middle. */
export function mirrored(point: Point, size: Size, symmetry: Symmetry) {
  const out = [point];
  const mx = size.w - 1 - point.x;
  const my = size.h - 1 - point.y;
  if (symmetry === "horizontal" || symmetry === "both")
    out.push({ x: mx, y: point.y });
  if (symmetry === "vertical" || symmetry === "both")
    out.push({ x: point.x, y: my });
  if (symmetry === "both") out.push({ x: mx, y: my });
  return out;
}

/**
 * Sets one pixel of `data` (RGBA of the whole tile) and its mirror copies,
 * wrapping or clipping at the edges and skipping pixels outside the mask.
 */
export function plot(
  data: Uint8ClampedArray,
  point: Point,
  ink: Ink,
  options: PaintOptions,
) {
  const { size, symmetry, tiled, mask, density } = options;
  for (const copy of mirrored(point, size, symmetry)) {
    const at = wrapPixel(copy.x, copy.y, size, tiled);
    if (!at || !inPattern(at.x, at.y, density)) continue;
    const i = at.y * size.w + at.x;
    if (mask && !mask[i]) continue;
    const rgba = typeof ink === "function" ? ink(i) : ink;
    if (rgba) data.set(rgba, i * 4);
  }
}

/**
 * Stamps a brush tip (see brushTip) at every point. `origin` turns a point
 * into the tip's top-left pixel, e.g. centring a square tip on it.
 */
export function paintPoints(
  data: Uint8ClampedArray,
  points: Point[],
  tip: TipRect[],
  origin: (point: Point) => Point,
  ink: Ink,
  options: PaintOptions,
) {
  for (const point of points) {
    const { x, y } = origin(point);
    for (const r of tip)
      for (let dy = 0; dy < r.h; dy++)
        for (let dx = 0; dx < r.w; dx++)
          plot(data, { x: x + r.dx + dx, y: y + r.dy + dy }, ink, options);
  }
}

/** A picture used as the brush: RGBA of w × h, painted where it isn't transparent. */
export type Stamp = { w: number; h: number; pixels: Uint8ClampedArray };

/**
 * Stamps a picture brush centred on every point: in its own colours, or
 * as a silhouette in `solid`.
 */
export function paintStamp(
  data: Uint8ClampedArray,
  points: Point[],
  stamp: Stamp,
  solid: Rgba | null,
  options: PaintOptions,
) {
  const ox = Math.floor((stamp.w - 1) / 2);
  const oy = Math.floor((stamp.h - 1) / 2);
  for (const point of points)
    for (let y = 0; y < stamp.h; y++)
      for (let x = 0; x < stamp.w; x++) {
        const j = (y * stamp.w + x) * 4;
        if (!stamp.pixels[j + 3]) continue;
        const own = stamp.pixels.subarray(j, j + 4);
        plot(
          data,
          { x: point.x - ox + x, y: point.y - oy + y },
          solid ?? [own[0]!, own[1]!, own[2]!, own[3]!],
          options,
        );
      }
}

/**
 * Shading ink (as in Aseprite): each pixel whose colour is in the palette
 * moves one step along it (`step` +1 towards the end, −1 towards the start);
 * other pixels stay as they are. Reads `before`, so a pixel shades once per
 * stroke however often the stroke passes over it.
 */
export function shadingInk(
  before: Uint8ClampedArray,
  palette: string[],
  step: 1 | -1,
): Ink {
  const colors = palette.map(rgbaOf);
  const index = new Map(
    colors.map((c, i) => [(c[0] << 16) | (c[1] << 8) | c[2], i]),
  );
  return (i) => {
    if (!before[i * 4 + 3]) return null;
    const key =
      (before[i * 4]! << 16) | (before[i * 4 + 1]! << 8) | before[i * 4 + 2]!;
    const at = index.get(key);
    if (at === undefined) return null;
    return colors[Math.max(0, Math.min(colors.length - 1, at + step))]!;
  };
}

/** `#rrggbb` as an opaque RGBA colour. */
export function rgbaOf(hex: string): Rgba {
  const v = hex.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
    255,
  ];
}
