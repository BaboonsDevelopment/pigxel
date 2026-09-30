/**
 * Palettes: lists of `#rrggbb` colours saved with a tile, to paint from. The
 * presets are well-known pixel art palettes, credited to their authors on
 * Lospec (lospec.com/palette-list).
 */

export const MAX_PALETTE = 256;

export type PalettePreset = { id: string; name: string; colors: string[] };

// prettier-ignore
export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "pico-8",
    name: "PICO-8",
    colors: [
      "#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f",
      "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436",
      "#29adff", "#83769c", "#ff77a8", "#ffccaa",
    ],
  },
  {
    id: "sweetie-16",
    name: "Sweetie 16",
    colors: [
      "#1a1c2c", "#5d275d", "#b13e53", "#ef7d57", "#ffcd75", "#a7f070",
      "#38b764", "#257179", "#29366f", "#3b5dc9", "#41a6f6", "#73eff7",
      "#f4f4f4", "#94b0c2", "#566c86", "#333c57",
    ],
  },
  {
    id: "endesga-32",
    name: "Endesga 32",
    colors: [
      "#be4a2f", "#d77643", "#ead4aa", "#e4a672", "#b86f50", "#733e39",
      "#3e2731", "#a22633", "#e43b44", "#f77622", "#feae34", "#fee761",
      "#63c74d", "#3e8948", "#265c42", "#193c3e", "#124e89", "#0099db",
      "#2ce8f5", "#ffffff", "#c0cbdc", "#8b9bb4", "#5a6988", "#3a4466",
      "#262b44", "#181425", "#ff0044", "#68386c", "#b55088", "#f6757a",
      "#e8b796", "#c28569",
    ],
  },
];

/** What a new tile starts with. */
export const DEFAULT_PALETTE = PALETTE_PRESETS[0]!.colors;

const HEX = /^#[0-9a-f]{6}$/;

/** A colour as `#rrggbb` in lowercase, or null when it isn't one. */
export function normalizeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const color = value.trim().toLowerCase();
  return HEX.test(color) ? color : null;
}

/** A list of colours checked one by one: bad entries dropped, repeats kept once, at most MAX_PALETTE. */
export function readPalette(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const colors = new Set<string>();
  for (const entry of value) {
    const color = normalizeColor(entry);
    if (color) colors.add(color);
    if (colors.size === MAX_PALETTE) break;
  }
  return [...colors];
}

/** The opaque colours of `pixels` (RGBA), most used first, at most `max`. */
export function colorsOf(pixels: Uint8ClampedArray, max = MAX_PALETTE) {
  const counts = new Map<number, number>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const key = (pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([key]) => `#${key.toString(16).padStart(6, "0")}`);
}

/** Most recently used first, without repeats, at most `max`. */
export function pushRecent(recent: string[], color: string, max = 12) {
  return [color, ...recent.filter((c) => c !== color)].slice(0, max);
}
