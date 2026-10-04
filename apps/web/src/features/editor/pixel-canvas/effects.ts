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

export type AdjustKind = "hueSaturation" | "brightnessContrast";

export function adjustedColors(
  kind: AdjustKind,
  pixels: Uint8ClampedArray,
  mask: Uint8Array | null,
  values: Record<string, number>,
): Uint8ClampedArray {
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
