import type { RGB } from "./quantize";

export type Bitmap = { rgba: Uint8ClampedArray; w: number; h: number };
export type Size = { w: number; h: number };
export type Box = { x: number; y: number } & Size;

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

export function opaqueBox(image: Bitmap): Box | null {
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
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function cropBitmap(image: Bitmap, box: Box): Bitmap {
  const rgba = new Uint8ClampedArray(box.w * box.h * 4);
  for (let y = 0; y < box.h; y++) {
    const from = ((box.y + y) * image.w + box.x) * 4;
    rgba.set(image.rgba.subarray(from, from + box.w * 4), y * box.w * 4);
  }
  return { rgba, w: box.w, h: box.h };
}
