import { resizeNearest, type Bitmap, type Size } from "@/lib/image/bitmap";
import {
  backgroundColor,
  safeFileBase,
  type Background,
} from "@/lib/pigxel-file/format";
import { clipToTile, type Slice } from "@/lib/slices/slices";
import type { PixelRatio } from "@/lib/sprite/pixel-ratio";
import { scalePicture, scaledSlices } from "@/lib/sprite/sprite-size";
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

export type ExportSource = {
  name: string;
  size: Size;
  frames: Frame[];
  frameId: string;
  background: Background;
  picture: (frameId: string) => Uint8ClampedArray;
  slices: Slice[];
};

export type ExportFile = { name: string; mime: string } & (
  { image: Bitmap } | { data: Uint8Array<ArrayBuffer> | string }
);

export function stretchedSource(
  source: ExportSource,
  ratio: PixelRatio,
): ExportSource {
  const size = { w: source.size.w * ratio.w, h: source.size.h * ratio.h };
  return {
    ...source,
    size,
    picture: (id) =>
      scalePicture(
        { rgba: source.picture(id), ...source.size },
        size.w,
        size.h,
        "nearest",
      ),
    slices: scaledSlices(source.slices, source.size, size),
  };
}

export const clampScale = (scale: number) =>
  Math.min(
    MAX_EXPORT_SCALE,
    Math.max(MIN_EXPORT_SCALE, Math.round(scale) || MIN_EXPORT_SCALE),
  );

function slicesOnTile(slices: Slice[], tile: Size) {
  return slices.flatMap((slice) => {
    const area = clipToTile(slice.bounds, tile.w, tile.h);
    return area ? [{ slice, area }] : [];
  });
}

export function exportSize(
  settings: ExportSettings,
  tile: Size,
  frameCount: number,
  slices: Slice[] = [],
): Size {
  const { scale } = settings;
  const frame = { w: tile.w * scale, h: tile.h * scale };
  if (settings.format === "sheet")
    return sheetSize(frameCount, settings.layout, frame);
  if (settings.format === "slices") {
    const areas = slicesOnTile(slices, tile).map((s) => s.area);
    return {
      w: Math.max(0, ...areas.map((a) => a.w)) * scale,
      h: Math.max(0, ...areas.map((a) => a.h)) * scale,
    };
  }
  return frame;
}

export const fitsCanvas = ({ w, h }: Size) =>
  w <= MAX_EXPORT_SIDE && h <= MAX_EXPORT_SIDE;

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

  if (format === "slices") {
    const picture = source.picture(source.frameId);
    const used = new Set<string>();
    return slicesOnTile(source.slices, tile).map(({ slice, area }) => {
      const rgba = new Uint8ClampedArray(area.w * area.h * 4);
      for (let y = 0; y < area.h; y++) {
        const from = ((area.y + y) * tile.w + area.x) * 4;
        rgba.set(picture.subarray(from, from + area.w * 4), y * area.w * 4);
      }
      const own = safeFileBase(slice.name);
      let name = own;
      for (let n = 2; used.has(name.toLowerCase()); n++) name = `${own} ${n}`;
      used.add(name.toLowerCase());
      return {
        name: name + extension,
        mime,
        image: resizeNearest(
          { rgba, w: area.w, h: area.h },
          area.w * scale,
          area.h * scale,
        ),
      };
    });
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
    slices: source.slices,
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
