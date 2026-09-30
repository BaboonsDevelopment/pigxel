import type { Bitmap, Size } from "@/lib/image/bitmap";
import { imageToPixelArt } from "@/lib/image/helpers";
import { GENERATED_PICTURE_STEPS } from "@/lib/image/pipeline";

/** A picture from the AI (a data URL), turned into pixel art at the area's size. Browser only. */
export async function toArt(dataUrl: string, area: Size): Promise<Bitmap> {
  const image = await (await fetch(dataUrl)).blob();
  return imageToPixelArt(image, area.w, area.h, GENERATED_PICTURE_STEPS);
}
