import type { Bitmap } from "./bitmap";

export type LineArt = "transparent" | "dark-on-light" | "light-on-dark";
export const MIN_STROKE_CONTRAST = 64;

/** Sparse monochrome drawings need stroke coverage, not a majority-colour
 * sample: a one-pixel pen stroke rarely wins against its paper/background. */
export function lineArtKind(image: Bitmap): LineArt | null {
  let opaque = 0,
    neutral = 0,
    light = 0,
    dark = 0,
    darkInk = 0,
    lightInk = 0;
  const total = image.w * image.h;
  for (let i = 0; i < total; i++) {
    const p = i * 4;
    if (image.rgba[p + 3]! < 128) continue;
    opaque++;
    const r = image.rgba[p]!,
      g = image.rgba[p + 1]!,
      b = image.rgba[p + 2]!;
    if (Math.max(r, g, b) - Math.min(r, g, b) <= 24) neutral++;
    const tone = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (tone >= 224) light++;
    if (tone <= 31) dark++;
    if (tone <= 255 - MIN_STROKE_CONTRAST) darkInk++;
    if (tone >= MIN_STROKE_CONTRAST) lightInk++;
  }
  if (!opaque || neutral < opaque * 0.98) return null;
  if (opaque <= total * 0.25) return "transparent";
  // Do not treat a shaded grayscale sprite or a photograph as sparse ink.
  if (opaque < total * 0.98) return null;
  if (light >= total * 0.75 && darkInk > 0 && darkInk <= total * 0.25)
    return "dark-on-light";
  if (dark >= total * 0.75 && lightInk > 0 && lightInk <= total * 0.25)
    return "light-on-dark";
  return null;
}
