import type { RGB } from "./quantize";

// Settings for each rule of the picture → pixel art pipeline (see pipeline.ts).

// ── Cut out the background ─────────────────────────────────────────────────

/**
 * Background colour generated pictures are painted on, then cut out.
 * Image models cannot return real transparency, so they are asked for this.
 */
export const CHROMA_KEY: RGB = { r: 255, g: 0, b: 255 };
export const CHROMA_KEY_HEX = "#FF00FF";
/** How far from the key colour a pixel may be and still count as background. */
export const CHROMA_KEY_TOLERANCE = 120;
/**
 * An edge pixel whose red and blue both exceed its green by this much is a
 * blend of the subject with the key, and is cut out too.
 */
export const FRINGE_MAGENTA = 40;
/** How many pixels deep into the edge blended pixels are looked for. */
export const FRINGE_PASSES = 2;
/** Pixels trimmed off the whole outline afterwards, at picture resolution. */
export const EDGE_TRIM = 1;

// ── Recover the model's own pixel grid ─────────────────────────────────────

/** Neighbouring pixels closer than this count as one pixel-art "pixel". */
export const GRID_SAME_COLOR = 32;
/** Plausible size of one model pixel, in picture pixels, and the search step. */
export const MIN_GRID_CELL = 4;
export const MAX_GRID_CELL = 64;
export const GRID_STEP = 0.1;
/** How far a stretch may be off a whole number of model pixels, in pixels. */
export const GRID_SLACK = 1.5;
/** Share of stretches that must be whole model pixels to trust a size. */
export const MIN_GRID_FIT = 0.85;

// ── Shrink to the tile ─────────────────────────────────────────────────────

/** Palette size grows with the tile: about one colour per 3 pixels of side. */
export const PALETTE_PER_SIDE = 1 / 3;
export const MIN_PALETTE = 8;
