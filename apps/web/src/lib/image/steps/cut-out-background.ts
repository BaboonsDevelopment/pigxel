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
  FRINGE_MAGENTA,
  FRINGE_PASSES,
} from "../constants";

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
    // Dark red/purple details are foreground. Only trim bright key-colour spill.
    Math.min(channel(image, i, 0), channel(image, i, 2)) >= 160 &&
    channel(image, i, 0) - g > FRINGE_MAGENTA &&
    channel(image, i, 2) - g > FRINGE_MAGENTA
  );
};

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
  return image;
}
