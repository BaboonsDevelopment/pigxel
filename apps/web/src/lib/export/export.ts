import { resizeNearest, type Bitmap, type Size } from "@/lib/image/bitmap";
import {
  backgroundColor,
  safeFileBase,
  type Background,
} from "@/lib/pigxel-file/format";
import type { Frame } from "@/lib/sprite/types";
import {
  EXPORT_FORMATS,
  JPEG_BACKGROUND,
  MAX_EXPORT_SCALE,
  MAX_EXPORT_SIDE,
  MIN_EXPORT_SCALE,
  type ExportSettings,
} from "./constants";
import { encodeGif } from "./gif";
import { buildSheet, sheetData, sheetSize } from "./sheet";

/** What an export is made from: the tile as the editor has it. */
export type ExportSource = {
  /** The tile's name, which the files are named after. */
  name: string;
  size: Size;
  frames: Frame[];
  /** The frame on screen, which PNG and JPEG export. */
  frameId: string;
  background: Background;
  /** A frame's layers combined as they are exported, i.e. without references. */
  picture: (frameId: string) => Uint8ClampedArray;
};

/**
 * A file to save. A picture still has to be encoded as `mime` (PNG or JPEG),
 * which takes a browser; the rest are ready.
 */
export type ExportFile = { name: string; mime: string } & (
  { image: Bitmap } | { data: Uint8Array<ArrayBuffer> | string }
);

export const clampScale = (scale: number) =>
  Math.min(
    MAX_EXPORT_SCALE,
    Math.max(MIN_EXPORT_SCALE, Math.round(scale) || MIN_EXPORT_SCALE),
  );

/** The size of the picture an export makes: one frame, or the whole sheet. */
export function exportSize(
  settings: ExportSettings,
  tile: Size,
  frameCount: number,
): Size {
  const frame = { w: tile.w * settings.scale, h: tile.h * settings.scale };
  return settings.format === "sheet"
    ? sheetSize(frameCount, settings.layout, frame)
    : frame;
}

/** Whether a browser can draw a picture this big. */
export const fitsCanvas = ({ w, h }: Size) =>
  w <= MAX_EXPORT_SIDE && h <= MAX_EXPORT_SIDE;

/** `rgba` flattened onto a solid `#rrggbb` colour, for formats without transparency. */
export function onColor(rgba: Uint8ClampedArray, hex: string) {
  const bg = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const out = new Uint8ClampedArray(rgba.length);
  for (let p = 0; p < rgba.length; p += 4) {
    const a = rgba[p + 3]! / 255;
    for (let c = 0; c < 3; c++)
      out[p + c] = Math.round(rgba[p + c]! * a + bg[c]! * (1 - a));
    out[p + 3] = 255;
  }
  return out;
}

/** The files an export saves: the picture, and for a sheet its JSON if asked. */
export function exportFiles(
  source: ExportSource,
  settings: ExportSettings,
): ExportFile[] {
  const { format, scale } = settings;
  const { extension, mime } = EXPORT_FORMATS.find((f) => f.id === format)!;
  const base = safeFileBase(source.name);
  const tile = source.size;
  const frame = { w: tile.w * scale, h: tile.h * scale };
  const scaled = (id: string) =>
    resizeNearest(
      { rgba: source.picture(id), w: tile.w, h: tile.h },
      frame.w,
      frame.h,
    );

  if (format === "png")
    return [{ name: base + extension, mime, image: scaled(source.frameId) }];

  if (format === "jpeg") {
    const image = scaled(source.frameId);
    const color = backgroundColor(source.background) ?? JPEG_BACKGROUND;
    return [
      {
        name: base + extension,
        mime,
        image: { ...image, rgba: onColor(image.rgba, color) },
      },
    ];
  }

  if (format === "gif")
    return [
      {
        name: base + extension,
        mime,
        data: encodeGif(
          source.frames.map((f) => ({
            rgba: scaled(f.id).rgba,
            duration: f.duration,
          })),
          frame.w,
          frame.h,
        ),
      },
    ];

  const name = `${base}-sheet${extension}`;
  const sheet: ExportFile = {
    name,
    mime,
    image: buildSheet(
      source.frames.map((f) => scaled(f.id)),
      settings.layout,
    ),
  };
  if (!settings.sheetData) return [sheet];
  const data = sheetData({
    name: base,
    image: name,
    durations: source.frames.map((f) => f.duration),
    layout: settings.layout,
    frame,
    scale,
  });
  return [
    sheet,
    {
      name: `${base}-sheet.json`,
      mime: "application/json",
      data: JSON.stringify(data, null, 2),
    },
  ];
}
