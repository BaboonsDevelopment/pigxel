import { decodeImage } from "./decode";
import { cutOutBackground } from "./steps/cut-out-background";

/** Display-only copy: keep the original source for subsequent AI edits. */
export async function transparentPicturePreview(
  source: string,
): Promise<string> {
  const response = await fetch(source);
  if (!response.ok) throw new Error("Picture preview could not be loaded.");
  const image = cutOutBackground(await decodeImage(await response.blob()));
  const canvas = document.createElement("canvas");
  canvas.width = image.w;
  canvas.height = image.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Picture preview canvas is unavailable.");
  ctx.putImageData(
    new ImageData(
      image.rgba as Uint8ClampedArray<ArrayBuffer>,
      image.w,
      image.h,
    ),
    0,
    0,
  );
  return canvas.toDataURL("image/png");
}
