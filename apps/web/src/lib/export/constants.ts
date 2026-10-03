/** What a tile can be exported as. */
export const EXPORT_FORMATS = [
  {
    id: "png",
    label: "PNG",
    extension: ".png",
    mime: "image/png",
    description: "The frame on screen, with transparency.",
  },
  {
    id: "jpeg",
    label: "JPEG",
    extension: ".jpg",
    mime: "image/jpeg",
    description:
      "The frame on screen on a solid background. Edges soften slightly; use PNG for game art.",
  },
  {
    id: "gif",
    label: "GIF",
    extension: ".gif",
    mime: "image/gif",
    description: "Every frame as a looping animation.",
  },
  {
    id: "sheet",
    label: "Sprite sheet",
    extension: ".png",
    mime: "image/png",
    description: "Every frame side by side in one PNG, for game engines.",
  },
  {
    id: "slices",
    label: "Slices",
    extension: ".png",
    mime: "image/png",
    description:
      "Each slice of the frame on screen as its own PNG, named after it.",
  },
] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number]["id"];

/** How the frames of a sprite sheet are arranged. */
export const SHEET_LAYOUTS = [
  { id: "row", label: "Row" },
  { id: "column", label: "Column" },
  { id: "grid", label: "Grid" },
] as const;

export type SheetLayout = (typeof SHEET_LAYOUTS)[number]["id"];

export type ExportSettings = {
  format: ExportFormat;
  /** Each tile pixel becomes a `scale × scale` square. */
  scale: number;
  layout: SheetLayout;
  /** Also downloads the sheet's frame positions and durations as JSON. */
  sheetData: boolean;
  /** Wide or tall pixels come out stretched to their shape (see PixelRatio). */
  applyRatio: boolean;
};

export const DEFAULT_EXPORT: ExportSettings = {
  format: "png",
  scale: 1,
  layout: "row",
  sheetData: false,
  applyRatio: true,
};

export const MIN_EXPORT_SCALE = 1;
export const MAX_EXPORT_SCALE = 20;

/** Longest side browsers reliably draw a canvas of, in pixels. */
export const MAX_EXPORT_SIDE = 16384;

/** What a transparent tile is flattened onto in formats without transparency. */
export const JPEG_BACKGROUND = "#ffffff";

/** GIF colour tables hold at most 256 colours; one is kept for transparency. */
export const GIF_MAX_COLORS = 255;

/**
 * Shortest GIF frame delay, in hundredths of a second: browsers show faster
 * frames at 100 ms instead.
 */
export const GIF_MIN_DELAY = 2;

/** Pixels less opaque than this are transparent in a GIF, which has no partial alpha. */
export const GIF_ALPHA_CUTOFF = 128;
