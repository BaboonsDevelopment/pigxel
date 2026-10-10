import { flattenDocument, parsePigxel, type PigxelDocument } from "./format";

const THUMBNAIL_SIDE = 64;

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

const draftThumbnails = new Map<string, string>();

export function draftThumbnail(draft: {
  id: string;
  savedAt: number;
  file: string;
}): string {
  const key = `${draft.id}:${draft.savedAt}`;
  const known = draftThumbnails.get(key);
  if (known !== undefined) return known;
  let url = "";
  try {
    url = thumbnailDataUrl(parsePigxel(draft.file));
  } catch {}
  draftThumbnails.set(key, url);
  return url;
}
