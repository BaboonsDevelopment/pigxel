import { PIG } from "../pixel-art";

/** The pig the world is built from: a 16 × 16 grid, "" where empty. */
export const SIZE = 16;
export type Grid = string[];

const PIG_COLORS: Record<string, string> = {
  r: "#d06a88",
  b: "#edb3c5",
  k: "#343330",
};

export const PALETTE = [
  { name: "Rose", color: "#d06a88" },
  { name: "Blush", color: "#edb3c5" },
  { name: "Butter", color: "#e7be5f" },
  { name: "Leaf", color: "#71927a" },
  { name: "Sky", color: "#6f9be8" },
  { name: "Ink", color: "#343330" },
] as const;

export const INK = "#343330";

export function pigGrid(): Grid {
  return PIG.flatMap((row) => [...row].map((key) => PIG_COLORS[key] ?? ""));
}

export const at = (x: number, y: number) => y * SIZE + x;

const isEar = (x: number) => x <= 4 || x >= 11;

/**
 * Four frames made from whatever is drawn: rest, ears perked, blink,
 * ears perked. They change only a few pixels, like a real idle loop.
 */
export function frameOf(grid: Grid, frame: number): Grid {
  const out = [...grid];
  if (frame === 1 || frame === 3)
    for (let x = 0; x < SIZE; x++) {
      if (!isEar(x)) continue;
      out[at(x, 0)] = grid[at(x, 1)]!;
      out[at(x, 1)] = grid[at(x, 2)]!;
    }
  if (frame === 2)
    for (let x = 0; x < SIZE; x++)
      if (grid[at(x, 6)] === INK) out[at(x, 6)] = grid[at(x, 5)] || "";
  return out;
}

export const colorCount = (grid: Grid) => new Set(grid.filter(Boolean)).size;

type Rgb = [number, number, number];

const rgbCache = new Map<string, Rgb>();
export function rgb(hex: string): Rgb {
  let value = rgbCache.get(hex);
  if (!value) {
    value = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
    rgbCache.set(hex, value);
  }
  return value;
}

const toHex = ([r, g, b]: Rgb) =>
  "#" +
  [r, g, b]
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

export function mix(a: string, b: string, t: number) {
  const [x, y] = [rgb(a), rgb(b)];
  return toHex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * t) as Rgb);
}

/** The same colour moved to an icy blue, keeping its lightness. */
export function icy(hex: string) {
  if (hex === INK) return hex;
  const [r, g, b] = rgb(hex).map((v) => v / 255) as Rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  const h = 214 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const u = (t + 1) % 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return toHex(
    [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)].map(
      (v) => v * 255,
    ) as Rgb,
  );
}
