export type DecodedImage = { rgba: Uint8ClampedArray; w: number; h: number };

const sourceCap = (target: number) =>
  Math.min(2048, Math.max(1024, target * 8));

/** Reads an image file into raw RGBA pixels, shrinking very large pictures. */
export async function decodeImage(
  source: Blob,
  target = 64,
): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(source);
  try {
    const cap = sourceCap(target);
    const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");

    ctx.imageSmoothingEnabled = scale < 1;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    return { rgba: ctx.getImageData(0, 0, w, h).data, w, h };
  } finally {
    bitmap.close();
  }
}
