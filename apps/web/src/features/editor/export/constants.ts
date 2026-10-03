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

export const SHEET_LAYOUTS = [
  { id: "row", label: "Row" },
  { id: "column", label: "Column" },
  { id: "grid", label: "Grid" },
] as const;

export type SheetLayout = (typeof SHEET_LAYOUTS)[number]["id"];

export type ExportSettings = {
  format: ExportFormat;
  scale: number;
  layout: SheetLayout;
  sheetData: boolean;
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

export const MAX_EXPORT_SIDE = 16384;

export const JPEG_BACKGROUND = "#ffffff";

export const GIF_MAX_COLORS = 255;

export const GIF_MIN_DELAY = 2;

export const GIF_ALPHA_CUTOFF = 128;
