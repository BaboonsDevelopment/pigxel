import { encodePng } from "@/features/editor/export/apng";
import { flattenDocument, type PigxelDocument } from "@/lib/pigxel-file/format";

export const SHARE_SIZE = { width: 1200, height: 630 };

const BACKDROP = [253, 240, 244];
const MARGIN = 60;

export function shareImage(doc: PigxelDocument): Uint8Array<ArrayBuffer> {
  const { width: W, height: H } = SHARE_SIZE;
  const scale = Math.max(
    1,
    Math.floor(
      Math.min((W - MARGIN * 2) / doc.width, (H - MARGIN * 2) / doc.height),
    ),
  );
  const w = doc.width * scale;
  const h = doc.height * scale;
  const left = Math.floor((W - w) / 2);
  const top = Math.floor((H - h) / 2);
  const art = flattenDocument(doc);
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const to = (y * W + x) * 4;
      const ax = x - left;
      const ay = y - top;
      const inside = ax >= 0 && ay >= 0 && ax < w && ay < h;
      const from = inside
        ? (Math.floor(ay / scale) * doc.width + Math.floor(ax / scale)) * 4
        : -1;
      const alpha = from < 0 ? 0 : art[from + 3]! / 255;
      for (let c = 0; c < 3; c++)
        rgba[to + c] = Math.round(
          (from < 0 ? 0 : art[from + c]!) * alpha + BACKDROP[c]! * (1 - alpha),
        );
      rgba[to + 3] = 255;
    }
  return encodePng(rgba, W, H);
}
