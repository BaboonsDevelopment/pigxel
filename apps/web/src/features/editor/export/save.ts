import { downloadBlob } from "@/lib/utils/download";
import type { ExportFile } from "./export";

const JPEG_QUALITY = 1;

async function toBlob(file: ExportFile): Promise<Blob> {
  if ("data" in file) return new Blob([file.data], { type: file.mime });
  const { rgba, w, h } = file.image;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can’t draw the picture.");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
  return canvas.convertToBlob({ type: file.mime, quality: JPEG_QUALITY });
}

export async function saveExport(files: ExportFile[]) {
  const blobs = await Promise.all(files.map(toBlob));
  blobs.forEach((blob, i) => downloadBlob(blob, files[i]!.name));
}
