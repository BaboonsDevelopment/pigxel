import type { CSSProperties } from "react";
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

export type CanvasGrid = { w: number; h: number; x: number; y: number };

export type GridLook = { color: string; opacity: number };

export const DEFAULT_GRID_LOOK: GridLook = { color: "#3b82f6", opacity: 55 };

export const MAX_GRID = 256;

export const squareGrid = (n: number): CanvasGrid => ({
  w: n,
  h: n,
  x: 0,
  y: 0,
});

export function gridStyle(
  grid: CanvasGrid,
  look: GridLook,
  scale: number,
): CSSProperties {
  const color = `color-mix(in srgb, ${look.color} ${look.opacity}%, transparent)`;
  return {
    backgroundImage: [
      `linear-gradient(to right, ${color} 1px, transparent 1px)`,
      `linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
    ].join(", "),
    backgroundSize: `${grid.w * scale}px ${grid.h * scale}px`,
    backgroundPosition: `${grid.x * scale}px ${grid.y * scale}px`,
  };
}

export type CanvasView = {
  symmetry: Symmetry;
  axes: Axes | null;
  tiled: TiledMode;
  onion: number;
  onionSettings: OnionSettings;
  grid: CanvasGrid | null;
  gridLook: GridLook;
  pixelGrid: boolean;
  snap: boolean;
};

export const DEFAULT_VIEW: CanvasView = {
  symmetry: "none",
  axes: null,
  tiled: "none",
  onion: 0,
  onionSettings: DEFAULT_ONION,
  grid: null,
  gridLook: DEFAULT_GRID_LOOK,
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
