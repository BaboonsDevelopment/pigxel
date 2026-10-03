import type { Bitmap, Size } from "@/lib/image/bitmap";
import { imageToPixelArt } from "@/lib/image/helpers";
import { GENERATED_PICTURE_STEPS, type Step } from "@/lib/image/pipeline";
import type { Area } from "@/components/pixel-canvas/constants";
import { canvasOf } from "@/components/pixel-canvas/helpers";
import type { SheetLayout } from "@/lib/ai/helpers";
import { CHROMA_KEY_HEX } from "@/lib/image/constants";
import {
  FRAMES_SHEET_SIDE,
  REFERENCE_QUALITY,
  REFERENCE_SIDE,
} from "../constants";

export async function toReference(file: File): Promise<string | null> {
  const image = await createImageBitmap(file).catch(() => null);
  if (!image) return null;
  const k = Math.min(1, REFERENCE_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * k));
  canvas.height = Math.max(1, Math.round(image.height * k));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return canvas.toDataURL("image/webp", REFERENCE_QUALITY);
}

export async function toArt(
  dataUrl: string,
  area: Size,
  steps: Step[] = GENERATED_PICTURE_STEPS,
): Promise<Bitmap> {
  const image = await (await fetch(dataUrl)).blob();
  return imageToPixelArt(image, area.w, area.h, steps);
}

export function framesSheet(
  cels: Uint8ClampedArray[],
  size: Size,
  box: Area,
  layout: SheetLayout,
): string {
  const k = Math.max(
    1,
    Math.floor(
      FRAMES_SHEET_SIDE / Math.max(layout.cols * box.w, layout.rows * box.h),
    ),
  );
  const out = document.createElement("canvas");
  out.width = layout.cols * box.w * k;
  out.height = layout.rows * box.h * k;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = CHROMA_KEY_HEX;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = false;
  cels.forEach((cel, i) => {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    ctx.drawImage(
      canvasOf(cel, size),
      box.x,
      box.y,
      box.w,
      box.h,
      col * box.w * k,
      row * box.h * k,
      box.w * k,
      box.h * k,
    );
  });
  return out.toDataURL("image/png");
}
