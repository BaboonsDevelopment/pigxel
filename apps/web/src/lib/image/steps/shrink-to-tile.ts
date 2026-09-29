import type { Bitmap, Size } from "../bitmap";
import { MIN_PALETTE, PALETTE_PER_SIDE } from "../constants";
import { imageToSprite } from "../quantize";

/** Small tiles read best with few colours; bigger ones can hold more shading. */
const paletteSize = ({ w, h }: Size) =>
  Math.max(MIN_PALETTE, Math.round(Math.sqrt(w * h) * PALETTE_PER_SIDE));

/**
 * Fits the sprite into the tile area: builds a palette sized to the area and
 * gives each tile pixel the most common colour of the sprite pixels under it.
 */
export function shrinkToTile(image: Bitmap, target: Size): Bitmap {
  const { buf } = imageToSprite(
    image.rgba,
    image.w,
    image.h,
    target.w,
    target.h,
    {
      colors: paletteSize(target),
      // The background was already cut out by an earlier step.
      keepBackground: true,
    },
  );
  return { rgba: buf, w: target.w, h: target.h };
}
