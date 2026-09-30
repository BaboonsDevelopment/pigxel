import { isOpaque, type Bitmap } from "../bitmap";

/**
 * Cuts the empty space around the subject away, so it fills the tile area
 * when shrunk, however much room the model left around it.
 */
export function cropToContent(image: Bitmap): Bitmap {
  let [x0, y0, x1, y1] = [image.w, image.h, -1, -1];
  for (let i = 0; i < image.w * image.h; i++) {
    if (!isOpaque(image, i)) continue;
    const x = i % image.w;
    const y = (i - x) / image.w;
    [x0, y0, x1, y1] = [
      Math.min(x0, x),
      Math.min(y0, y),
      Math.max(x1, x),
      Math.max(y1, y),
    ];
  }
  if (x1 < 0) return image;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((y0 + y) * image.w + x0) * 4;
    rgba.set(image.rgba.subarray(from, from + w * 4), y * w * 4);
  }
  return { rgba, w, h };
}
