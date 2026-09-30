import {
  channel,
  clearPixel,
  colorDistance,
  copyBitmap,
  isOpaque,
  neighbours,
  rgbAt,
  type Bitmap,
} from "../bitmap";
import {
  CHROMA_KEY,
  CHROMA_KEY_TOLERANCE,
  EDGE_TRIM,
  FRINGE_MAGENTA,
  FRINGE_PASSES,
} from "../constants";

/** Opaque pixels that touch a transparent one. */
function edgePixels(image: Bitmap): number[] {
  const out: number[] = [];
  for (let i = 0; i < image.w * image.h; i++) {
    if (
      isOpaque(image, i) &&
      neighbours(image, i).some((n) => !isOpaque(image, n))
    ) {
      out.push(i);
    }
  }
  return out;
}

const isMagentaBlend = (image: Bitmap, i: number) => {
  const g = channel(image, i, 1);
  return (
    channel(image, i, 0) - g > FRINGE_MAGENTA &&
    channel(image, i, 2) - g > FRINGE_MAGENTA
  );
};

/**
 * Removes the magenta background, then the magenta-tinted blend the model
 * paints where the subject meets it, then trims the outline slightly.
 * Only edge pixels are checked for blends, so purple inside the subject stays.
 */
export function cutOutBackground(source: Bitmap): Bitmap {
  const image = copyBitmap(source);
  for (let i = 0; i < image.w * image.h; i++) {
    if (colorDistance(rgbAt(image, i), CHROMA_KEY) <= CHROMA_KEY_TOLERANCE) {
      clearPixel(image, i);
    }
  }
  for (let pass = 0; pass < FRINGE_PASSES; pass++) {
    const blends = edgePixels(image).filter((i) => isMagentaBlend(image, i));
    blends.forEach((i) => clearPixel(image, i));
  }
  for (let pass = 0; pass < EDGE_TRIM; pass++) {
    edgePixels(image).forEach((i) => clearPixel(image, i));
  }
  return image;
}
