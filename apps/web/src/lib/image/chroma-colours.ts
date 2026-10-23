import { rgbAt, type Bitmap, type Size } from "./bitmap";
import type { RGB } from "./quantize";

/** The key hue, including its darker blends with a subject's outline. */
export const isKeyHue = (colour: RGB) =>
  Math.min(colour.r, colour.b) - colour.g >= 24 &&
  Math.abs(colour.r - colour.b) <=
    Math.max(20, Math.min(colour.r, colour.b) * 0.25);

/** Purple paint must have support inside the silhouette. A key-coloured rim
 * or a clipped pixel on the canvas border is not a foreground material. */
export function hasPurpleMaterial(image: Bitmap, target: Size): boolean {
  const sx = Math.max(1, Math.ceil(image.w / target.w));
  const sy = Math.max(1, Math.ceil(image.h / target.h));
  for (let y = sy; y < image.h - sy; y++)
    for (let x = sx; x < image.w - sx; x++) {
      const i = y * image.w + x;
      if (!image.rgba[i * 4 + 3]) continue;
      const colour = rgbAt(image, i);
      if (
        colour.r - colour.g < 16 ||
        colour.b - colour.g < 24 ||
        colour.b < colour.r * 0.75
      )
        continue;
      let solid = true;
      for (let dy = -sy; dy <= sy && solid; dy += sy)
        for (let dx = -sx; dx <= sx; dx += sx)
          if (!image.rgba[((y + dy) * image.w + x + dx) * 4 + 3]) {
            solid = false;
            break;
          }
      if (solid) return true;
    }
  return false;
}

export function removeKeyHue(image: Bitmap) {
  for (let i = 0; i < image.w * image.h; i++)
    if (image.rgba[i * 4 + 3] && isKeyHue(rgbAt(image, i)))
      image.rgba.fill(0, i * 4, i * 4 + 4);
}
