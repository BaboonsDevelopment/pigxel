import { ASPECT_RATIOS, IMAGE_STYLE_RULES } from "./constants";

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
