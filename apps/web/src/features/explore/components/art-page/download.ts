import { encodePng } from "@/features/editor/export/apng";
import { encodeGif } from "@/features/editor/export/gif";
import { packSheet, PLAIN_SHEET } from "@/features/editor/export/sheet";
import { encodeWebp } from "@/features/editor/export/webp";
import { resizeNearest } from "@/lib/image/bitmap";
import { downloadBlob } from "@/lib/utils/download";
import type { Picture } from "./helpers";

const TARGET = 512;
const MAX_SIDE = 4096;
const SCALES = [1, 2, 4, 8, 16, 32];

export function downloadScales(width: number, height: number) {
  const side = Math.max(width, height);
  const fits = SCALES.filter((scale) => side * scale <= MAX_SIDE);
  return fits.length ? fits : [1];
}

export function defaultScale(width: number, height: number) {
  const target = TARGET / Math.max(width, height);
  const scales = downloadScales(width, height);
  return scales.filter((scale) => scale <= target).at(-1) ?? scales[0]!;
}

export const DOWNLOAD_FORMATS = [
  { value: "png", label: "PNG", hint: "Still image" },
  { value: "gif", label: "GIF", hint: "Animated, works everywhere" },
  { value: "webp", label: "WebP", hint: "Animated, smaller file" },
  { value: "sheet", label: "Sprite sheet", hint: "All frames in one PNG" },
] as const;

export type DownloadFormat = (typeof DOWNLOAD_FORMATS)[number]["value"];

export function downloadPicture(
  picture: Picture,
  name: string,
  format: DownloadFormat,
  scale: number,
) {
  const { width, height } = picture;
  const w = width * scale;
  const h = height * scale;
  const scaled = (pixels: ImageData) =>
    resizeNearest({ rgba: pixels.data, w: width, h: height }, w, h).rgba;
  const frames = () =>
    picture.frames.map((f) => ({
      rgba: scaled(f.pixels),
      duration: f.duration,
    }));
  const fileName = name.replace(/[\/:*?"<>|]+/g, "").trim() || "pigxel-art";

  if (format === "gif") {
    const data = encodeGif(frames(), w, h);
    downloadBlob(new Blob([data], { type: "image/gif" }), `${fileName}.gif`);
    return;
  }
  if (format === "webp") {
    const data = encodeWebp(frames(), w, h);
    downloadBlob(new Blob([data], { type: "image/webp" }), `${fileName}.webp`);
    return;
  }
  if (format === "sheet") {
    const { image } = packSheet(
      picture.frames.map((f, i) => ({
        name: String(i),
        image: { rgba: f.pixels.data, w: width, h: height },
        duration: f.duration,
        group: 0,
      })),
      PLAIN_SHEET,
      scale,
    );
    const data = encodePng(image.rgba, image.w, image.h);
    downloadBlob(
      new Blob([data], { type: "image/png" }),
      `${fileName}-sheet.png`,
    );
    return;
  }
  const data = encodePng(scaled(picture.frames[0]!.pixels), w, h);
  downloadBlob(new Blob([data], { type: "image/png" }), `${fileName}.png`);
}
