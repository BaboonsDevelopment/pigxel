import { flattenDocument, type PigxelDocument } from "./format";

/** Longest side of a tile-list thumbnail, in pixels. */
const THUMBNAIL_SIDE = 64;

/** A small PNG data URL of the tile for lists; browser only. */
export function thumbnailDataUrl(image: PigxelDocument): string {
  const source = document.createElement("canvas");
  source.width = image.width;
  source.height = image.height;
  source
    .getContext("2d")
    ?.putImageData(
      new ImageData(
        flattenDocument(image) as Uint8ClampedArray<ArrayBuffer>,
        image.width,
        image.height,
      ),
      0,
      0,
    );
  const k = Math.min(1, THUMBNAIL_SIDE / Math.max(image.width, image.height));
  if (k === 1) return source.toDataURL("image/png");
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(image.width * k));
  out.height = Math.max(1, Math.round(image.height * k));
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
