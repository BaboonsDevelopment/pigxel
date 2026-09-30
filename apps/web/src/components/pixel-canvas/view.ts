import type { Symmetry, TiledMode } from "./paint";

/** How the canvas is shown and drawn on, apart from the tools: the View menu and the mode controls. */
export type CanvasView = {
  symmetry: Symmetry;
  tiled: TiledMode;
  /** How many frames before and after the active one show faintly; 0 turns onion skin off. */
  onion: number;
  /** A grid line every this many pixels over the pixel grid; 0 for none. */
  gridSize: number;
  /** The faint line around every pixel. */
  pixelGrid: boolean;
};

export const DEFAULT_VIEW: CanvasView = {
  symmetry: "none",
  tiled: "none",
  onion: 0,
  gridSize: 0,
  pixelGrid: true,
};

export const GRID_SIZES = [8, 16, 32];
export const ONION_FRAMES = [1, 2, 3];

/**
 * The frames onion skin shows around `index`, nearest first, with how
 * strongly each shows: 1 frame away is the clearest.
 */
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
