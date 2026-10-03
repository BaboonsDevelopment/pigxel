import type { BlendMode } from "./types";

/** A colour with channels from 0 to 1. */
type Rgb = [number, number, number];

/**
 * Blend formulas from the W3C Compositing spec (the ones Aseprite uses), plus
 * Aseprite's Addition, Subtract and Divide. `b` is the backdrop, `s` the layer.
 */
type Channel = (b: number, s: number) => number;

const multiply: Channel = (b, s) => b * s;
const screen: Channel = (b, s) => b + s - b * s;
const hardLight: Channel = (b, s) =>
  s <= 0.5 ? multiply(b, 2 * s) : screen(b, 2 * s - 1);

const SEPARABLE: Partial<Record<BlendMode, Channel>> = {
  normal: (_, s) => s,
  multiply,
  screen,
  overlay: (b, s) => hardLight(s, b),
  darken: Math.min,
  lighten: Math.max,
  "color-dodge": (b, s) =>
    b === 0 ? 0 : s >= 1 ? 1 : Math.min(1, b / (1 - s)),
  "color-burn": (b, s) =>
    b >= 1 ? 1 : s === 0 ? 0 : 1 - Math.min(1, (1 - b) / s),
  "hard-light": hardLight,
  "soft-light": (b, s) => {
    if (s <= 0.5) return b - (1 - 2 * s) * b * (1 - b);
    const d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
    return b + (2 * s - 1) * (d - b);
  },
  difference: (b, s) => Math.abs(b - s),
  exclusion: (b, s) => b + s - 2 * b * s,
  addition: (b, s) => Math.min(1, b + s),
  subtract: (b, s) => Math.max(0, b - s),
  divide: (b, s) => (s === 0 ? (b === 0 ? 0 : 1) : Math.min(1, b / s)),
};

// Hue, Saturation, Color and Luminosity work on the colour as a whole.
const lum = ([r, g, b]: Rgb) => 0.3 * r + 0.59 * g + 0.11 * b;
const sat = (c: Rgb) => Math.max(...c) - Math.min(...c);

function clipColor(c: Rgb): Rgb {
  const l = lum(c);
  const n = Math.min(...c);
  const x = Math.max(...c);
  return c.map((v) => {
    if (n < 0) v = l + ((v - l) * l) / (l - n);
    if (x > 1) v = l + ((v - l) * (1 - l)) / (x - l);
    return v;
  }) as Rgb;
}

const setLum = (c: Rgb, l: number) =>
  clipColor(c.map((v) => v + (l - lum(c))) as Rgb);

function setSat(c: Rgb, s: number): Rgb {
  const max = Math.max(...c);
  const min = Math.min(...c);
  if (max === min) return [0, 0, 0];
  return c.map((v) =>
    v === max ? s : v === min ? 0 : ((v - min) * s) / (max - min),
  ) as Rgb;
}

const NON_SEPARABLE: Partial<Record<BlendMode, (b: Rgb, s: Rgb) => Rgb>> = {
  hue: (b, s) => setLum(setSat(s, sat(b)), lum(b)),
  saturation: (b, s) => setLum(setSat(b, sat(s)), lum(b)),
  color: (b, s) => setLum(s, lum(b)),
  luminosity: (b, s) => setLum(b, lum(s)),
};

/** The per-channel formula of `mode`; none for Hue, Saturation, Color and Luminosity. */
export const channelBlend = (mode: BlendMode): Channel | undefined =>
  SEPARABLE[mode];

/** The colour a layer pixel `s` makes over the backdrop `b` in `mode`. */
export function blend(mode: BlendMode, b: Rgb, s: Rgb): Rgb {
  const whole = NON_SEPARABLE[mode];
  if (whole) return whole(b, s);
  const channel = SEPARABLE[mode] ?? SEPARABLE.normal!;
  return [channel(b[0], s[0]), channel(b[1], s[1]), channel(b[2], s[2])];
}
