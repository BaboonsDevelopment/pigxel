import type { RGB } from "./quantize";

/**
 * Background colour generated pictures are painted on, then cut out.
 * Image models cannot return real transparency, so they are asked for this.
 */
export const CHROMA_KEY: RGB = { r: 255, g: 0, b: 255 };
export const CHROMA_KEY_HEX = "#FF00FF";

/** How far from the key colour a pixel may be and still count as background. */
export const CHROMA_KEY_TOLERANCE = 120;
