import type { Bitmap } from "./bitmap";
import { decodeImage } from "./decode";
import { runSteps, type Step } from "./pipeline";

/**
 * Turns a picture into `width × height` pixel art by running it through
 * `steps` (see pipeline.ts). Browser-only: decoding needs a canvas.
 */
export async function imageToPixelArt(
  source: Blob,
  width: number,
  height: number,
  steps: Step[],
): Promise<Bitmap> {
  const { rgba, w, h } = await decodeImage(source, Math.max(width, height));
  return runSteps({ rgba, w, h }, { w: width, h: height }, steps);
}

/**
 * Fits a picture into a `width × height` tile, keeping its proportions and
 * centring it; the rest stays transparent. Smooth, not pixel art: for a
 * reference to trace over. Browser-only.
 */
export async function fitImageToTile(
  source: Blob,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const bitmap = await createImageBitmap(source);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    const k = Math.min(width / bitmap.width, height / bitmap.height);
    const w = bitmap.width * k;
    const h = bitmap.height * k;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
    return ctx.getImageData(0, 0, width, height).data;
  } finally {
    bitmap.close();
  }
}
