import type { Axes, Symmetry, TiledMode } from "./paint";

export type CanvasView = {
  symmetry: Symmetry;
  axes: Axes | null;
  tiled: TiledMode;
  onion: number;
  gridSize: number;
  pixelGrid: boolean;
  snap: boolean;
};

export const DEFAULT_VIEW: CanvasView = {
  symmetry: "none",
  axes: null,
  tiled: "none",
  onion: 0,
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

export function onionFrames(count: number, index: number, frames: number) {
  const out: { index: number; before: boolean; strength: number }[] = [];
  for (let step = 1; step <= count; step++) {
    const strength = 1 - (step - 1) / count;
    if (index - step >= 0)
      out.push({ index: index - step, before: true, strength });
    if (index + step < frames)
      out.push({ index: index + step, before: false, strength });
  }
  return out;
}
