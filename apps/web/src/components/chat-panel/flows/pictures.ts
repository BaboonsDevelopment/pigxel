import type { Bitmap, Size } from "@/lib/image/bitmap";
import { imageToPixelArt } from "@/lib/image/helpers";
import { GENERATED_PICTURE_STEPS, type Step } from "@/lib/image/pipeline";
import { REFERENCE_QUALITY, REFERENCE_SIDE } from "../constants";

/**
 * A picture the user attached, shrunk to at most REFERENCE_SIDE a side (it
 * only shows the AI what to draw) as a data URL; null when it can't be read.
 * Browser only.
 */
export async function toReference(file: File): Promise<string | null> {
  const image = await createImageBitmap(file).catch(() => null);
  if (!image) return null;
  const k = Math.min(1, REFERENCE_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * k));
  canvas.height = Math.max(1, Math.round(image.height * k));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  // WebP keeps transparency and stays small; browsers without it give PNG.
  return canvas.toDataURL("image/webp", REFERENCE_QUALITY);
}

/**
 * A picture from the AI (a data URL), turned into pixel art at the area's
 * size: a new picture (cropped to its subject) or a redraw (kept as framed).
 * Browser only.
 */
export async function toArt(
  dataUrl: string,
  area: Size,
  steps: Step[] = GENERATED_PICTURE_STEPS,
): Promise<Bitmap> {
  const image = await (await fetch(dataUrl)).blob();
  return imageToPixelArt(image, area.w, area.h, steps);
}
