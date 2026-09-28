import { ASPECT_RATIOS, IMAGE_STYLE_RULES } from "./constants";
import type { Rect } from "./types";

/** Wraps a subject description in the pixel-art style rules for a grid size. */
export function buildImagePrompt(
  subject: string,
  width: number,
  height: number,
): string {
  return [
    subject,
    `Pixel art sprite on a ${width}x${height} pixel grid,`,
    ...IMAGE_STYLE_RULES,
  ].join(" ");
}

/** The supported frame shape closest to `width × height`. */
export function closestAspectRatio(width: number, height: number): string {
  const target = Math.log(width / height);
  const distance = (ratio: string) => {
    const [w = 1, h = 1] = ratio.split(":").map(Number);
    return Math.abs(Math.log(w / h) - target);
  };
  return ASPECT_RATIOS.reduce((best, r) =>
    distance(r) < distance(best) ? r : best,
  );
}

/** Asks for a spot on a `width × height` tile where `subject` fits the scene. */
export function buildComposePrompt(
  subject: string,
  width: number,
  height: number,
): string {
  return [
    `This is a ${width}x${height} pixel art tile, shown enlarged; light grey means empty.`,
    `Choose where to add: ${subject}.`,
    "Pick a rectangle that makes the scene look good together: a size that matches",
    "the scale of what is already there, standing on the same ground or floating where",
    "it makes sense, without covering the important parts of existing objects.",
    `Answer in tile pixels: x and y of the top-left corner, then w and h;`,
    `the rectangle must stay inside 0..${width} by 0..${height}.`,
  ].join(" ");
}

/** Keeps a rectangle inside a `width × height` tile, at least 1×1. */
export function clampRect(rect: Rect, width: number, height: number): Rect {
  const int = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0);
  const x = Math.max(0, Math.min(width - 1, int(rect.x)));
  const y = Math.max(0, Math.min(height - 1, int(rect.y)));
  return {
    x,
    y,
    w: Math.max(1, Math.min(width - x, int(rect.w))),
    h: Math.max(1, Math.min(height - y, int(rect.h))),
  };
}
