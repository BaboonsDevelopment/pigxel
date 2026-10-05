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
import type { FrameTag } from "@/lib/sprite/tags";
import {
  EXPORT_FORMATS,
  JPEG_BACKGROUND,
  MAX_EXPORT_SCALE,
  MAX_EXPORT_SIDE,
  MIN_EXPORT_SCALE,
  type ExportSettings,
} from "./constants";
import { zipSync } from "fflate";
import { maskBounds } from "../pixel-canvas/selection";
import { encodeApng, encodePng } from "./apng";
import { encodeGif } from "./gif";
import { encodeWebp } from "./webp";
import {
  packSheet,
  sheetData,
  sheetSize,
  type SheetItem,
  type SheetOptions,
} from "./sheet";
import { timelapseSize } from "./timelapse";

export type ExportSource = {
  name: string;
  size: Size;
  frames: Frame[];
  tags?: FrameTag[];
  frameId: string;
  background: Background;
  picture: (frameId: string) => Uint8ClampedArray;
  stages?: (frameId: string) => Uint8ClampedArray[];
  layers?: {
    id: string;
    name: string;
    picture: (frameId: string) => Uint8ClampedArray;
  }[];
  compose?: (layerIds: string[], frameId: string) => Uint8ClampedArray;
  selection?: Uint8Array | null;
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
  const stretch = (rgba: Uint8ClampedArray) =>
    scalePicture({ rgba, ...source.size }, size.w, size.h, "nearest");
  const { stages, layers } = source;
  return {
    ...source,
    size,
    picture: (id) => stretch(source.picture(id)),
    stages: stages && ((id) => stages(id).map(stretch)),
    layers: layers?.map((layer) => ({
      ...layer,
      picture: (id: string) => stretch(layer.picture(id)),
    })),
    slices: scaledSlices(source.slices, source.size, size),
  };
}

export function partialSource(
  source: ExportSource,
  settings: ExportSettings,
): ExportSource {
  let out = source;
  const known = new Set(source.layers?.map((layer) => layer.id));
  const chosen = settings.partLayers?.filter((id) => known.has(id));
  const { compose } = source;
  if (chosen && compose) {
    const picture = (id: string) => compose(chosen, id);
    out = {
      ...out,
      picture,
      stages: (id) => [picture(id)],
      layers: out.layers?.filter((layer) => chosen.includes(layer.id)),
    };
  }
  const tag = settings.partTag
    ? source.tags?.find((item) => item.id === settings.partTag)
    : undefined;
  if (tag) {
    const frames = out.frames.slice(tag.from, tag.to + 1);
    out = {
      ...out,
      frames,
      frameId: frames.some((frame) => frame.id === out.frameId)
        ? out.frameId
        : frames[0]!.id,
      tags: [{ ...tag, from: 0, to: frames.length - 1 }],
    };
  }
  const mask = settings.partSelection ? source.selection : null;
  const area = mask ? maskBounds(mask, source.size) : null;
  if (mask && area) {
    const crop = (rgba: Uint8ClampedArray) => {
      const piece = new Uint8ClampedArray(area.w * area.h * 4);
      for (let y = 0; y < area.h; y++)
        for (let x = 0; x < area.w; x++) {
          const i = (area.y + y) * source.size.w + area.x + x;
          if (mask[i])
            piece.set(rgba.subarray(i * 4, i * 4 + 4), (y * area.w + x) * 4);
        }
      return piece;
    };
    const { picture, stages, layers } = out;
    out = {
      ...out,
      size: { w: area.w, h: area.h },
      picture: (id) => crop(picture(id)),
      stages: stages && ((id) => stages(id).map(crop)),
      layers: layers?.map((layer) => ({
        ...layer,
        picture: (id: string) => crop(layer.picture(id)),
      })),
      slices: out.slices.map((slice) => ({
        ...slice,
        bounds: {
          ...slice.bounds,
          x: slice.bounds.x - area.x,
          y: slice.bounds.y - area.y,
        },
      })),
      selection: null,
    };
  }
  return out;
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

const sheetOptions = (settings: ExportSettings): SheetOptions => ({
  layout: settings.layout,
  border: settings.sheetBorder,
  spacing: settings.sheetSpacing,
  inner: settings.sheetInner,
  trim: settings.sheetTrim,
  merge: settings.sheetMerge,
  skipEmpty: settings.sheetSkipEmpty,
});

function sheetItems(
  source: ExportSource,
  split: ExportSettings["sheetSplit"],
): SheetItem[] {
  const base = safeFileBase(source.name);
  const bitmap = (rgba: Uint8ClampedArray) => ({ rgba, ...source.size });
  if (split === "layers" && source.layers?.length)
    return source.layers.flatMap((layer, group) =>
      source.frames.map((frame, n) => ({
        name: `${base} (${layer.name}) ${n}.png`,
        image: bitmap(layer.picture(frame.id)),
        duration: frame.duration,
        group,
      })),
    );
  if (split === "tags" && source.tags?.length)
    return source.tags.flatMap((tag, group) =>
      source.frames.slice(tag.from, tag.to + 1).map((frame, n) => ({
        name: `${base} #${tag.name} ${n}.png`,
        image: bitmap(source.picture(frame.id)),
        duration: frame.duration,
        group,
      })),
    );
  return source.frames.map((frame, n) => ({
    name: `${base} ${n}.png`,
    image: bitmap(source.picture(frame.id)),
    duration: frame.duration,
    group: 0,
  }));
}

export const exactSheetSize = (
  source: ExportSource,
  settings: ExportSettings,
) =>
  sheetSize(
    sheetItems(source, settings.sheetSplit),
    sheetOptions(settings),
    settings.scale,
  );

export function exportSize(
  settings: ExportSettings,
  tile: Size,
  frameCount: number,
  slices: Slice[] = [],
): Size {
  const { scale } = settings;
  const frame = { w: tile.w * scale, h: tile.h * scale };
  if (settings.format === "timelapse")
    return timelapseSize(settings.timelapseShape);
  if (settings.format === "sheet") {
    const blank = { rgba: new Uint8ClampedArray(4), w: tile.w, h: tile.h };
    return sheetSize(
      Array.from({ length: frameCount }, () => ({
        name: "",
        image: blank,
        duration: 0,
        group: 0,
      })),
      {
        ...sheetOptions(settings),
        trim: false,
        merge: false,
        skipEmpty: false,
      },
      scale,
    );
  }
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
  if (format === "timelapse")
    throw new Error("Timelapses are rendered with renderTimelapse.");
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

  if (format === "frames") {
    const digits = String(source.frames.length - 1).length;
    const pictures = Object.fromEntries(
      source.frames.map((f, n) => {
        const image = scaled(f.id);
        return [
          `${base} ${String(n).padStart(digits, "0")}.png`,
          encodePng(image.rgba, image.w, image.h),
        ];
      }),
    );
    return [
      {
        name: `${base}-frames${extension}`,
        mime,
        data: zipSync(pictures, { level: 0 }) as Uint8Array<ArrayBuffer>,
      },
    ];
  }

  if (format === "apng" || format === "webp") {
    const encode = format === "apng" ? encodeApng : encodeWebp;
    return [
      {
        name: `${base}-animated${extension}`,
        mime,
        data: encode(
          source.frames.map((f) => ({
            rgba: scaled(f.id).rgba,
            duration: f.duration,
          })),
          frame.w,
          frame.h,
        ),
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
  const packed = packSheet(
    sheetItems(source, settings.sheetSplit),
    sheetOptions(settings),
    scale,
  );
  const sheet: ExportFile = { name, mime, image: packed.image };
  if (!settings.sheetData) return [sheet];
  const data = sheetData({
    image: name,
    size: { w: packed.image.w, h: packed.image.h },
    frames: packed.frames,
    json: settings.sheetJson,
    scale,
    slices: source.slices,
    tags: settings.sheetSplit === "none" ? source.tags : [],
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
