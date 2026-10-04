import type { Axes, Symmetry, TiledMode } from "./paint";

export type OnionSide = "both" | "before" | "after";

export type OnionSettings = {
  opacity: number;
  tint: boolean;
  before: string;
  after: string;
  side: OnionSide;
  inTag: boolean;
};

export const DEFAULT_ONION: OnionSettings = {
  opacity: 40,
  tint: true,
  before: "#ff465a",
  after: "#3c82ff",
  side: "both",
  inTag: false,
};

export const ONION_SIDES: { value: OnionSide; label: string }[] = [
  { value: "both", label: "Both" },
  { value: "before", label: "Behind only" },
  { value: "after", label: "Ahead only" },
];

export type CanvasView = {
  symmetry: Symmetry;
  axes: Axes | null;
  tiled: TiledMode;
  onion: number;
  onionSettings: OnionSettings;
  gridSize: number;
  pixelGrid: boolean;
  snap: boolean;
};

export const DEFAULT_VIEW: CanvasView = {
  symmetry: "none",
  axes: null,
  tiled: "none",
  onion: 0,
  onionSettings: DEFAULT_ONION,
  gridSize: 0,
  pixelGrid: true,
  snap: false,
};

export const GRID_SIZES = [8, 16, 32];

export const SYMMETRY_OPTIONS: [Symmetry, string][] = [
  ["none", "Off"],
  ["horizontal", "Left ↔ right"],
  ["vertical", "Top ↕ bottom"],
  ["both", "Both"],
  ["diagonal", "Diagonal ↘"],
  ["antiDiagonal", "Diagonal ↙"],
  ["all", "All eight ways"],
];

export const TILED_OPTIONS: [TiledMode, string][] = [
  ["none", "Off"],
  ["x", "Across"],
  ["y", "Down"],
  ["both", "Both"],
];
export const ONION_FRAMES = [1, 2, 3];

export function onionFrames(
  count: number,
  index: number,
  frames: number,
  side: OnionSide = "both",
  range = { from: 0, to: frames - 1 },
) {
  const out: { index: number; before: boolean; strength: number }[] = [];
  for (let step = 1; step <= count; step++) {
    const strength = 1 - (step - 1) / count;
    if (side !== "after" && index - step >= range.from)
      out.push({ index: index - step, before: true, strength });
    if (side !== "before" && index + step <= range.to)
      out.push({ index: index + step, before: false, strength });
  }
  return out;
}
