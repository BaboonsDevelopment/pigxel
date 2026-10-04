import type { Size } from "./constants";
import type { Point, TipRect } from "./pen";

export type Symmetry =
  | "none"
  | "horizontal"
  | "vertical"
  | "both"
  | "diagonal"
  | "antiDiagonal"
  | "all";

export type Axes = { x: number; y: number };

export const centreAxes = (size: Size): Axes => ({
  x: (size.w - 1) / 2,
  y: (size.h - 1) / 2,
});

export type TiledMode = "none" | "x" | "y" | "both";

export type Rgba = readonly [number, number, number, number];

export type Ink = Rgba | ((index: number) => Rgba | null);

export type PaintOptions = {
  size: Size;
  symmetry: Symmetry;
  axes?: Axes | null;
  tiled: TiledMode;
  mask: Uint8Array | null;
  density?: number;
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function inPattern(x: number, y: number, density = 100) {
  return density >= 100 || BAYER[y & 3]![x & 3]! < (density / 100) * 16;
}

export type GradientShape = "linear" | "radial";

export type GradientDither = "none" | "bayer4" | "bayer8";

function bayer8(x: number, y: number) {
  const corner = [
    [0, 2],
    [3, 1],
  ][(y >> 2) & 1]![(x >> 2) & 1]!;
  return 4 * BAYER[y & 3]![x & 3]! + corner;
}

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

export function mirrored(
  point: Point,
  size: Size,
  symmetry: Symmetry,
  axes?: Axes | null,
) {
  if (symmetry === "none") return [point];
  const { x: a, y: b } = axes ?? centreAxes(size);
  const mx = Math.round(2 * a - point.x);
  const my = Math.round(2 * b - point.y);
  const dx = Math.round(a + point.y - b);
  const dy = Math.round(b + point.x - a);
  const ax = Math.round(a - point.y + b);
  const ay = Math.round(b - point.x + a);
  const copies: Record<Exclude<Symmetry, "none">, Point[]> = {
    horizontal: [{ x: mx, y: point.y }],
    vertical: [{ x: point.x, y: my }],
    both: [
      { x: mx, y: point.y },
      { x: point.x, y: my },
      { x: mx, y: my },
    ],
    diagonal: [{ x: dx, y: dy }],
    antiDiagonal: [{ x: ax, y: ay }],
    all: [
      { x: mx, y: point.y },
      { x: point.x, y: my },
      { x: mx, y: my },
      { x: dx, y: dy },
      { x: ax, y: ay },
      { x: Math.round(2 * a - dx), y: dy },
      { x: dx, y: Math.round(2 * b - dy) },
    ],
  };
  return [point, ...copies[symmetry]];
}

function plot(
  data: Uint8ClampedArray,
  point: Point,
  ink: Ink,
  options: PaintOptions,
) {
  const { size, symmetry, axes, tiled, mask, density } = options;
  for (const copy of mirrored(point, size, symmetry, axes)) {
    const at = wrapPixel(copy.x, copy.y, size, tiled);
    if (!at || !inPattern(at.x, at.y, density)) continue;
    const i = at.y * size.w + at.x;
    if (mask && !mask[i]) continue;
    const rgba = typeof ink === "function" ? ink(i) : ink;
    if (rgba) data.set(rgba, i * 4);
  }
}

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

export type Stamp = { w: number; h: number; pixels: Uint8ClampedArray };

export function patternColor(stamp: Stamp, x: number, y: number): Rgba {
  const px = ((x % stamp.w) + stamp.w) % stamp.w;
  const py = ((y % stamp.h) + stamp.h) % stamp.h;
  const j = (py * stamp.w + px) * 4;
  return [
    stamp.pixels[j]!,
    stamp.pixels[j + 1]!,
    stamp.pixels[j + 2]!,
    stamp.pixels[j + 3]!,
  ];
}

export function paintStamp(
  data: Uint8ClampedArray,
  points: Point[],
  stamp: Stamp,
  solid: Rgba | null,
  options: PaintOptions,
  pattern = false,
) {
  const ox = Math.floor((stamp.w - 1) / 2);
  const oy = Math.floor((stamp.h - 1) / 2);
  for (const point of points)
    for (let y = 0; y < stamp.h; y++)
      for (let x = 0; x < stamp.w; x++) {
        const j = (y * stamp.w + x) * 4;
        if (!pattern && !stamp.pixels[j + 3]) continue;
        const at = { x: point.x - ox + x, y: point.y - oy + y };
        const own = pattern
          ? patternColor(stamp, at.x, at.y)
          : patternColor(stamp, x, y);
        if (!own[3]) continue;
        plot(data, at, solid ?? own, options);
      }
}

export type BlendMode = "simple" | "alpha" | "copy" | "lockAlpha";

function over(top: Rgba, under: Rgba): Rgba {
  const a = top[3] / 255;
  const b = (under[3] / 255) * (1 - a);
  const out = a + b;
  if (!out) return [0, 0, 0, 0];
  const mix = (c: number) => Math.round((top[c]! * a + under[c]! * b) / out);
  return [mix(0), mix(1), mix(2), Math.round(out * 255)];
}

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

export function rgbaOf(hex: string): Rgba {
  const v = hex.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
    255,
  ];
}
