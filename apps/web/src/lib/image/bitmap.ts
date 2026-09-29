import type { RGB } from "./quantize";

/** RGBA pixels with their size; what every pipeline step takes and returns. */
export type Bitmap = { rgba: Uint8ClampedArray; w: number; h: number };
export type Size = { w: number; h: number };

/** Channel `c` (0 r, 1 g, 2 b, 3 a) of pixel number `i`. */
export const channel = (image: Bitmap, i: number, c: number) =>
  image.rgba[i * 4 + c] ?? 0;

export const isOpaque = (image: Bitmap, i: number) => channel(image, i, 3) > 0;

export const rgbAt = (image: Bitmap, i: number): RGB => ({
  r: channel(image, i, 0),
  g: channel(image, i, 1),
  b: channel(image, i, 2),
});

export const clearPixel = (image: Bitmap, i: number) =>
  image.rgba.fill(0, i * 4, i * 4 + 4);

export const colorDistance = (a: RGB, b: RGB) =>
  Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

/** Pixel numbers of the up/down/left/right neighbours inside the image. */
export function neighbours(image: Bitmap, i: number): number[] {
  const x = i % image.w;
  const y = Math.floor(i / image.w);
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < image.w - 1) out.push(i + 1);
  if (y > 0) out.push(i - image.w);
  if (y < image.h - 1) out.push(i + image.w);
  return out;
}

export const copyBitmap = (image: Bitmap): Bitmap => ({
  ...image,
  rgba: new Uint8ClampedArray(image.rgba),
});

/** `image` at `w × h`, nearest neighbour, so pixel art stays crisp. */
export function resizeNearest(image: Bitmap, w: number, h: number): Bitmap {
  if (image.w === w && image.h === h) return image;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(image.h - 1, Math.floor((y * image.h) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(image.w - 1, Math.floor((x * image.w) / w));
      const from = (sy * image.w + sx) * 4;
      rgba.set(image.rgba.subarray(from, from + 4), (y * w + x) * 4);
    }
  }
  return { rgba, w, h };
}
