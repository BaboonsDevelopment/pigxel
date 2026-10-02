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

/** How the gradient tool spreads its colours: along the line, or out from its start. */
export type GradientShape = "linear" | "radial";

/** How the gradient tool blends: mixed colours, or an ordered dither of the two. */
export type GradientDither = "none" | "bayer4" | "bayer8";

/** The 8×8 Bayer matrix, built from the 4×4 one: values 0–63. */
function bayer8(x: number, y: number) {
  const corner = [
    [0, 2],
    [3, 1],
  ][(y >> 2) & 1]![(x >> 2) & 1]!;
  return 4 * BAYER[y & 3]![x & 3]! + corner;
}

/** How far (0–1) the pixel (x, y) is along a gradient dragged from `from` to `to`. */
export function gradientAt(
  x: number,
  y: number,
  from: Point,
  to: Point,
  shape: GradientShape,
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const clamp = (t: number) => Math.max(0, Math.min(1, t));
  if (shape === "radial") {
    const radius = Math.hypot(dx, dy);
    return radius ? clamp(Math.hypot(x - from.x, y - from.y) / radius) : 0;
  }
  const length = dx * dx + dy * dy;
  return length ? clamp(((x - from.x) * dx + (y - from.y) * dy) / length) : 0;
}

/**
 * Fills `data` (RGBA of the whole tile), or the masked part of it, with a
 * gradient from `start` at `from` to `end` at `to`. A dither keeps to the
 * two colours; without one they are mixed, which makes new shades.
 */
export function paintGradient(
  data: Uint8ClampedArray,
  from: Point,
  to: Point,
  start: Rgba,
  end: Rgba,
  shape: GradientShape,
  dither: GradientDither,
  options: Pick<PaintOptions, "size" | "mask">,
) {
  const { size, mask } = options;
  for (let y = 0; y < size.h; y++)
    for (let x = 0; x < size.w; x++) {
      const i = y * size.w + x;
      if (mask && !mask[i]) continue;
      const t = gradientAt(x, y, from, to, shape);
      if (dither === "none") {
        data.set(
          start.map((v, c) => Math.round(v + (end[c]! - v) * t)),
          i * 4,
        );
        continue;
      }
      const threshold =
        dither === "bayer8"
          ? (bayer8(x, y) + 0.5) / 64
          : (BAYER[y & 3]![x & 3]! + 0.5) / 16;
      data.set(t > threshold ? end : start, i * 4);
    }
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

/** How a colour meets the pixel under it (Aseprite's inks, shading aside). */
export type BlendMode = "simple" | "alpha" | "copy" | "lockAlpha";

/** `top` laid over `under` as glass: the usual "source over" blend. */
function over(top: Rgba, under: Rgba): Rgba {
  const a = top[3] / 255;
  const b = (under[3] / 255) * (1 - a);
  const out = a + b;
  if (!out) return [0, 0, 0, 0];
  const mix = (c: number) => Math.round((top[c]! * a + under[c]! * b) / out);
  return [mix(0), mix(1), mix(2), Math.round(out * 255)];
}

/**
 * Paints `rgba` (alpha is the stroke's opacity) by `mode`, reading each pixel
 * from `before`, so a stroke changes a pixel once however often it passes:
 * "simple" lays a see-through colour over drawn pixels but puts it as it is
 * on empty ones; "alpha" always lays it over; "copy" puts it as it is,
 * transparency included; "lockAlpha" colours only drawn pixels, keeping how
 * opaque each is.
 */
export function blendInk(
  before: Uint8ClampedArray,
  rgba: Rgba,
  mode: BlendMode,
): Ink {
  if (mode === "copy" || (mode === "simple" && rgba[3] === 255)) return rgba;
  return (i) => {
    const under: Rgba = [
      before[i * 4]!,
      before[i * 4 + 1]!,
      before[i * 4 + 2]!,
      before[i * 4 + 3]!,
    ];
    if (mode === "lockAlpha") {
      if (!under[3]) return null;
      const [r, g, b] = over(rgba, [under[0], under[1], under[2], 255]);
      return [r, g, b, under[3]];
    }
    if (mode === "simple" && !under[3]) return rgba;
    return over(rgba, under);
  };
}

/**
 * Blur ink: each pixel becomes the average of itself and its neighbours
 * (3×3, inside the tile) in `before`, so a stroke blurs each pixel once.
 * Colours are weighted by alpha, so transparent pixels soften an edge's
 * opacity without darkening its colour. Fully transparent areas stay as they are.
 */
export function blurInk(before: Uint8ClampedArray, size: Size): Ink {
  return (i) => {
    const x = i % size.w;
    const y = Math.floor(i / size.w);
    let count = 0;
    let alpha = 0;
    const rgb = [0, 0, 0];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size.w || ny >= size.h) continue;
        const at = (ny * size.w + nx) * 4;
        const a = before[at + 3]!;
        for (let c = 0; c < 3; c++) rgb[c]! += before[at + c]! * a;
        alpha += a;
        count++;
      }
    if (!alpha) return null;
    return [
      Math.round(rgb[0]! / alpha),
      Math.round(rgb[1]! / alpha),
      Math.round(rgb[2]! / alpha),
      Math.round(alpha / count),
    ];
  };
}

/**
 * Jumble ink: each pixel takes the colour `before` had at a random spot up
 * to 2 pixels away (inside the tile), so edges get ragged without any new
 * colours. The spot is fixed by `seed` and the pixel, so redrawing the stroke
 * picks the same one; a new stroke with a new seed jumbles further.
 */
export function jumbleInk(
  before: Uint8ClampedArray,
  size: Size,
  seed: number,
): Ink {
  return (i) => {
    let h = Math.imul(i ^ seed, 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h >>> 16;
    const dx = ((h >>> 0) % 5) - 2;
    const dy = ((h >>> 8) % 5) - 2;
    const x = (i % size.w) + dx;
    const y = Math.floor(i / size.w) + dy;
    if ((!dx && !dy) || x < 0 || y < 0 || x >= size.w || y >= size.h)
      return null;
    const at = (y * size.w + x) * 4;
    return [before[at]!, before[at + 1]!, before[at + 2]!, before[at + 3]!];
  };
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
