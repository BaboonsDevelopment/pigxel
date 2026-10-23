import "server-only";
import sharp from "sharp";
import { ANIMATION_GUTTER_PX, CHROMA_KEY_HEX } from "@/lib/image/constants";
import type { GeneratedImage } from "./types";

/** Show the generator real, clean gutters instead of edge-to-edge pose copies. */
export async function padAnimationReference(
  image: GeneratedImage,
  grid: { cols: number; rows: number },
): Promise<GeneratedImage> {
  const original = Buffer.from(image.base64, "base64");
  const dimensions = await sharp(original, {
    limitInputPixels: 16_777_216,
  }).metadata();
  const factor = Math.min(
    2048 / Math.max(dimensions.width!, dimensions.height!),
    Math.max(
      1,
      128 /
        Math.min(dimensions.width! / grid.cols, dimensions.height! / grid.rows),
    ),
  );
  const source = await sharp(original, { limitInputPixels: 16_777_216 })
    .resize(
      Math.round(dimensions.width! * factor),
      Math.round(dimensions.height! * factor),
      { kernel: "nearest" },
    )
    .png()
    .toBuffer();
  const meta = await sharp(source).metadata();
  const width = meta.width!,
    height = meta.height!;
  const pieces = [];
  const margin = Math.ceil(ANIMATION_GUTTER_PX / 2);
  for (let row = 0; row < grid.rows; row++)
    for (let col = 0; col < grid.cols; col++) {
      const x = Math.round((col * width) / grid.cols),
        y = Math.round((row * height) / grid.rows);
      const w = Math.round(((col + 1) * width) / grid.cols) - x,
        h = Math.round(((row + 1) * height) / grid.rows) - y;
      const scale = Math.min(
        1,
        Math.max(1, w - margin * 2) / w,
        Math.max(1, h - margin * 2) / h,
      );
      const innerW = Math.max(1, Math.floor(w * scale)),
        innerH = Math.max(1, Math.floor(h * scale));
      pieces.push({
        input: await sharp(source)
          .extract({ left: x, top: y, width: w, height: h })
          .resize(innerW, innerH, { kernel: "nearest" })
          .png()
          .toBuffer(),
        left: x + Math.floor((w - innerW) / 2),
        top: y + Math.floor((h - innerH) / 2),
      });
    }
  const bytes = await sharp({
    create: { width, height, channels: 4, background: CHROMA_KEY_HEX },
  })
    .composite(pieces)
    .png()
    .toBuffer();
  return { mimeType: "image/png", base64: bytes.toString("base64") };
}
