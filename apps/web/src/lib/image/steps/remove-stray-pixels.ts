import {
  clearPixel,
  copyBitmap,
  isOpaque,
  neighbours,
  type Bitmap,
} from "../bitmap";

const colorKey = (image: Bitmap, i: number) =>
  image.rgba.subarray(i * 4, i * 4 + 4).join(",");

export function removeStrayPixels(source: Bitmap): Bitmap {
  const image = copyBitmap(source);
  for (let i = 0; i < source.w * source.h; i++) {
    if (!isOpaque(source, i)) continue;
    const around = neighbours(source, i).filter((n) => isOpaque(source, n));
    if (around.length === 0) {
      clearPixel(image, i);
      continue;
    }
    const own = colorKey(source, i);
    if (around.length < 4 || around.some((n) => colorKey(source, n) === own)) {
      continue;
    }
    const counts = new Map<string, { at: number; n: number }>();
    for (const n of around) {
      const key = colorKey(source, n);
      const entry = counts.get(key) ?? { at: n, n: 0 };
      entry.n++;
      counts.set(key, entry);
    }
    const best = [...counts.values()].reduce((a, b) => (b.n > a.n ? b : a));
    if (best.n >= 2) {
      image.rgba.set(source.rgba.subarray(best.at * 4, best.at * 4 + 4), i * 4);
    }
  }
  return image;
}
