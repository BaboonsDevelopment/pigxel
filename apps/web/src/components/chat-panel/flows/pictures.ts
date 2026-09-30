import { imageBackdrop } from "@/lib/ai/actions";
import type { Bitmap, Size } from "@/lib/image/bitmap";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";
import { imageToPixelArt } from "@/lib/image/helpers";
import { GENERATED_PICTURE_STEPS, type Step } from "@/lib/image/pipeline";

/** Pictures going to and coming from the image model. Browser only. */

/**
 * A picture from the AI (a data URL), turned into pixel art at the area's
 * size: a new picture (cropped to its subject) or a redraw (kept as framed).
 */
export async function toArt(
  dataUrl: string,
  area: Size,
  steps: Step[] = GENERATED_PICTURE_STEPS,
): Promise<Bitmap> {
  const image = await (await fetch(dataUrl)).blob();
  return imageToPixelArt(image, area.w, area.h, steps);
}

/**
 * A picture made smaller (at most `side` pixels a side) as a PNG data URL,
 * so it can be sent back to the AI as a reference.
 */
export async function shrinkPicture(
  dataUrl: string,
  side: number,
): Promise<string> {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  try {
    const k = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

/**
 * The background for a picture sent to the image model as a reference, to
 * match what it draws: transparent (null), or the magenta it keys out.
 */
export async function referenceBackground(): Promise<string | null> {
  const backdrop = await imageBackdrop().catch(() => "chroma" as const);
  return backdrop === "transparent" ? null : CHROMA_KEY_HEX;
}
