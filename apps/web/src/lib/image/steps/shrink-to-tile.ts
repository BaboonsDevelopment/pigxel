import type { Bitmap, Size } from "../bitmap";
import { MIN_PALETTE, PALETTE_PER_SIDE } from "../constants";
import { imageToSprite } from "../quantize";

export const paletteSize = ({ w, h }: Size) =>
  Math.max(MIN_PALETTE, Math.round(Math.sqrt(w * h) * PALETTE_PER_SIDE));

export function shrinkToTile(image: Bitmap, target: Size): Bitmap {
  const { buf } = imageToSprite(
    image.rgba,
    image.w,
    image.h,
    target.w,
    target.h,
    {
      colors: paletteSize(target),
      keepBackground: true,
    },
  );
  return { rgba: buf, w: target.w, h: target.h };
}
