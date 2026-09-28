import { CHROMA_KEY_TOLERANCE } from "./constants";
import { decodeImage } from "./decode";
import {
  imageToSprite,
  removeChromaKey,
  type QuantizeOpts,
  type Quantized,
  type RGB,
} from "./quantize";

/**
 * Turns a picture into pixel art of the given size.
 * Pass `chromaKey` to cut out a flat background of that colour first.
 * Browser-only: decoding needs `createImageBitmap` and a canvas.
 */
export async function imageToPixelArt(
  source: Blob,
  width: number,
  height: number,
  opts?: QuantizeOpts & { chromaKey?: RGB },
): Promise<Quantized> {
  const { rgba, w, h } = await decodeImage(source, Math.max(width, height));
  if (opts?.chromaKey) {
    removeChromaKey(rgba, opts.chromaKey, CHROMA_KEY_TOLERANCE);
  }
  return imageToSprite(rgba, w, h, width, height, opts);
}
