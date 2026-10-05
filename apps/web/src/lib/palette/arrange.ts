import { alphaOf, hexToHsv, hsvToHsl, opaqueHex, withAlpha } from "./hsv";

type PaletteSort = "hue" | "saturation" | "brightness" | "luminance";

export const PALETTE_SORTS: { value: PaletteSort; label: string }[] = [
  { value: "hue", label: "Sort by hue" },
  { value: "saturation", label: "Sort by saturation" },
  { value: "brightness", label: "Sort by brightness" },
  { value: "luminance", label: "Sort by luminance" },
];

export const MIN_RAMP = 2;
export const MAX_RAMP = 32;

const channels = (hex: string) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  alphaOf(hex),
];

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

export function rampBetween(from: string, to: string, steps: number): string[] {
  const a = channels(from);
  const b = channels(to);
  const count = Math.min(MAX_RAMP, Math.max(MIN_RAMP, Math.round(steps)));
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const mix = (c: number) => a[c]! + (b[c]! - a[c]!) * t;
    return withAlpha(toHex(mix(0), mix(1), mix(2)), mix(3));
  });
}

const sortKey: Record<PaletteSort, (hex: string) => number[]> = {
  hue: (hex) => {
    const { h, s, v } = hexToHsv(hex);
    return [s < 0.05 || v < 0.05 ? 1 : 0, h, v];
  },
  saturation: (hex) => [hexToHsv(hex).s, hexToHsv(hex).v],
  brightness: (hex) => [hexToHsv(hex).v, hexToHsv(hex).s],
  luminance: (hex) => {
    const [r, g, b] = channels(opaqueHex(hex));
    return [0.2126 * r! + 0.7152 * g! + 0.0722 * b!, hsvToHsl(hexToHsv(hex)).l];
  },
};

export function sortedPalette(palette: string[], by: PaletteSort): string[] {
  const keys = new Map(palette.map((c) => [c, sortKey[by](c)]));
  return [...palette].sort((x, y) => {
    const a = keys.get(x)!;
    const b = keys.get(y)!;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
    return 0;
  });
}

export function withColors(
  palette: string[],
  colors: string[],
  max: number,
): string[] {
  return [...new Set([...palette, ...colors])].slice(0, max);
}
