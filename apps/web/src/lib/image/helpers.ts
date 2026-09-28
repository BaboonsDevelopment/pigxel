import { decodeImage } from "./decode";
import { imageToSprite, type QuantizeOpts, type Quantized } from "./quantize";

/**
 * Turns a picture into pixel art of the given size.
 * Browser-only: decoding needs `createImageBitmap` and a canvas.
 */
export async function imageToPixelArt(
  source: Blob,
  width: number,
  height: number,
  opts?: QuantizeOpts,
): Promise<Quantized> {
  const { rgba, w, h } = await decodeImage(source, Math.max(width, height));
  return imageToSprite(rgba, w, h, width, height, opts);
}
