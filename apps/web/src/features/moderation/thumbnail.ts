import { encodePng } from "@/features/editor/export/apng";
import { flattenDocument, type PigxelDocument } from "@/lib/pigxel-file/format";

const SIDE = 64;
const MAX_LENGTH = 50000;

export function checkedThumbnail(doc: PigxelDocument): string | null {
  const k = Math.min(1, SIDE / Math.max(doc.width, doc.height));
  const width = Math.max(1, Math.round(doc.width * k));
  const height = Math.max(1, Math.round(doc.height * k));
  const source = flattenDocument(doc);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = Math.floor((y * doc.height) / height);
    for (let x = 0; x < width; x++) {
      const sx = Math.floor((x * doc.width) / width);
      const from = (sy * doc.width + sx) * 4;
      rgba.set(source.subarray(from, from + 4), (y * width + x) * 4);
    }
  }
  const url = `data:image/png;base64,${Buffer.from(encodePng(rgba, width, height)).toString("base64")}`;
  return url.length <= MAX_LENGTH ? url : null;
}
