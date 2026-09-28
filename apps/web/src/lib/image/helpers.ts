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
