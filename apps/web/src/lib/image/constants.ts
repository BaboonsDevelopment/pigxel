import type { RGB } from "./quantize";

export const CHROMA_KEY: RGB = { r: 255, g: 0, b: 255 };
export const CHROMA_KEY_HEX = "#FF00FF";
export const CHROMA_KEY_TOLERANCE = 120;
export const FRINGE_MAGENTA = 40;
export const FRINGE_PASSES = 2;
export const EDGE_TRIM = 1;

export const GRID_SAME_COLOR = 32;
export const MIN_GRID_CELL = 4;
export const MAX_GRID_CELL = 64;
export const GRID_STEP = 0.1;
export const GRID_SLACK = 1.5;
export const MIN_GRID_FIT = 0.85;

export const PALETTE_PER_SIDE = 1 / 3;
export const MIN_PALETTE = 8;
