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

export type HueSaturation = {
  hue: number;
  saturation: number;
  lightness: number;
};

export type BrightnessContrast = { brightness: number; contrast: number };

function rgbToHsl(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d + 6) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [r + m, g + m, b + m];
}

function adjusted(
  pixels: Uint8ClampedArray,
  mask: Uint8Array | null,
  change: (r: number, g: number, b: number) => number[],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < pixels.length / 4; i++) {
    if (mask && !mask[i]) continue;
    const p = i * 4;
    if (!pixels[p + 3]) continue;
    out.set(change(pixels[p]!, pixels[p + 1]!, pixels[p + 2]!), p);
  }
  return out;
}

export function adjustedHueSaturation(
  pixels: Uint8ClampedArray,
  mask: Uint8Array | null,
  { hue, saturation, lightness }: HueSaturation,
): Uint8ClampedArray {
  const ks = saturation / 100;
  const kl = lightness / 100;
  return adjusted(pixels, mask, (r, g, b) => {
    const { h, s, l } = rgbToHsl(r / 255, g / 255, b / 255);
    const next = hslToRgb(
      (((h + hue) % 360) + 360) % 360,
      Math.min(1, s * (1 + ks)),
      kl > 0 ? l + (1 - l) * kl : l * (1 + kl),
    );
    return next.map((v) => Math.round(v * 255));
  });
}

export function adjustedBrightnessContrast(
  pixels: Uint8ClampedArray,
  mask: Uint8Array | null,
  { brightness, contrast }: BrightnessContrast,
): Uint8ClampedArray {
  const c = contrast * 2.55;
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const shift = brightness * 2.55;
  return adjusted(pixels, mask, (...rgb) =>
    rgb.map((v) => Math.round(factor * (v + shift - 128) + 128)),
  );
}

export function invertedColors(
  pixels: Uint8ClampedArray,
  mask: Uint8Array | null,
): Uint8ClampedArray {
  return adjusted(pixels, mask, (...rgb) => rgb.map((v) => 255 - v));
}

export function despeckled(
  pixels: Uint8ClampedArray,
  mask: Uint8Array | null,
  size: Size,
  radius: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  const { w, h } = size;
  const half = ((2 * radius + 1) ** 2) >> 1;
  const hist = new Uint32Array(256);
  const at = (x: number, y: number, c: number) =>
    pixels[
      (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) *
        4 +
        c
    ]!;
  for (let y = 0; y < h; y++) {
    if (mask && !mask.subarray(y * w, y * w + w).some(Boolean)) continue;
    for (let c = 0; c < 4; c++) {
      hist.fill(0);
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) hist[at(dx, y + dy, c)]!++;
      let median = 0;
      let below = 0;
      while (below + hist[median]! <= half) below += hist[median++]!;
      for (let x = 0; x < w; x++) {
        if (x > 0)
          for (let dy = -radius; dy <= radius; dy++) {
            const gone = at(x - radius - 1, y + dy, c);
            const come = at(x + radius, y + dy, c);
            hist[gone]!--;
            hist[come]!++;
            if (gone < median) below--;
            if (come < median) below++;
          }
        while (below > half) below -= hist[--median]!;
        while (below + hist[median]! <= half) below += hist[median++]!;
        const i = y * w + x;
        if (!mask || mask[i]) out[i * 4 + c] = median;
      }
    }
  }
  return out;
}

export type CurvePoint = [number, number];

export const STRAIGHT_CURVE: CurvePoint[] = [
  [0, 0],
  [255, 255],
];

export function curveTable(points: CurvePoint[]): Uint8ClampedArray {
  const n = points.length;
  const slopes = points.slice(0, -1).map(([x, y], i) => {
    const [nx, ny] = points[i + 1]!;
    return (ny - y) / (nx - x || 1);
  });
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0] ?? 0;
    if (i === n - 1) return slopes[n - 2] ?? 0;
    const a = slopes[i - 1]!;
    const b = slopes[i]!;
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  const table = new Uint8ClampedArray(256);
  let k = 0;
  for (let x = 0; x < 256; x++) {
    if (x <= points[0]![0]) {
      table[x] = Math.round(points[0]![1]);
      continue;
    }
    if (x >= points[n - 1]![0]) {
      table[x] = Math.round(points[n - 1]![1]);
      continue;
    }
    while (points[k + 1]![0] < x) k++;
    const [x0, y0] = points[k]!;
    const [x1, y1] = points[k + 1]!;
    const h = x1 - x0;
    const t = (x - x0) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    table[x] = Math.round(
      (2 * t3 - 3 * t2 + 1) * y0 +
        (t3 - 2 * t2 + t) * h * tangents[k]! +
        (-2 * t3 + 3 * t2) * y1 +
        (t3 - t2) * h * tangents[k + 1]!,
    );
  }
  return table;
}

export function curvedColors(
  pixels: Uint8ClampedArray,
  mask: Uint8Array | null,
  points: CurvePoint[],
): Uint8ClampedArray {
  const table = curveTable(points);
  return adjusted(pixels, mask, (...rgb) => rgb.map((v) => table[v]!));
}

export type AdjustKind =
  "hueSaturation" | "brightnessContrast" | "despeckle" | "curve";

export type AdjustSettings = {
  values: Record<string, number>;
  curve: CurvePoint[];
};

export function adjustedColors(
  kind: AdjustKind,
  pixels: Uint8ClampedArray,
  mask: Uint8Array | null,
  size: Size,
  { values, curve }: AdjustSettings,
): Uint8ClampedArray {
  if (kind === "despeckle")
    return despeckled(pixels, mask, size, values.radius ?? 1);
  if (kind === "curve") return curvedColors(pixels, mask, curve);
  return kind === "hueSaturation"
    ? adjustedHueSaturation(pixels, mask, {
        hue: values.hue ?? 0,
        saturation: values.saturation ?? 0,
        lightness: values.lightness ?? 0,
      })
    : adjustedBrightnessContrast(pixels, mask, {
        brightness: values.brightness ?? 0,
        contrast: values.contrast ?? 0,
      });
}
