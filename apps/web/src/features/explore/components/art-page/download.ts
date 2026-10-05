import { encodePng } from "@/features/editor/export/apng";
import { encodeGif } from "@/features/editor/export/gif";
import { resizeNearest } from "@/lib/image/bitmap";
import { downloadBlob } from "@/lib/utils/download";
import type { Picture } from "./helpers";

const TARGET = 512;

export function downloadPicture(picture: Picture, name: string) {
  const { width, height } = picture;
  const scale = Math.max(1, Math.floor(TARGET / Math.max(width, height)));
  const w = width * scale;
  const h = height * scale;
  const scaled = (pixels: ImageData) =>
    resizeNearest({ rgba: pixels.data, w: width, h: height }, w, h).rgba;
  const fileName = name.replace(/[\/:*?"<>|]+/g, "").trim() || "pigxel-art";
  if (picture.animated) {
    const data = encodeGif(
      picture.frames.map((f) => ({
        rgba: scaled(f.pixels),
        duration: f.duration,
      })),
      w,
      h,
    );
    downloadBlob(new Blob([data], { type: "image/gif" }), `${fileName}.gif`);
  } else {
    const data = encodePng(scaled(picture.frames[0]!.pixels), w, h);
    downloadBlob(new Blob([data], { type: "image/png" }), `${fileName}.png`);
  }
}
