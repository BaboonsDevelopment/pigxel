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
  {
    id: "timelapse",
    label: "Timelapse",
    extension: ".mp4",
    mime: "video/mp4",
    description:
      "A video of the frame on screen being drawn, ending with the Pigxel logo.",
  },
] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number]["id"];

export const SHEET_LAYOUTS = [
  { id: "row", label: "Row" },
  { id: "column", label: "Column" },
  { id: "grid", label: "Grid" },
] as const;

export type SheetLayout = (typeof SHEET_LAYOUTS)[number]["id"];

export const TIMELAPSE_STYLES = [
  {
    id: "rows",
    label: "Row by row",
    description: "Fills the art in line by line, top to bottom.",
  },
  {
    id: "colors",
    label: "Color by color",
    description:
      "Lays down one color at a time, darkest first, like inking before coloring.",
  },
  {
    id: "layers",
    label: "Layer by layer",
    description: "Builds the art up from the bottom layer to the top.",
  },
  {
    id: "scatter",
    label: "Scatter",
    description: "Pixels pop in all over the canvas at random.",
  },
  {
    id: "center",
    label: "From the center",
    description: "Grows outward from the middle of the canvas.",
  },
] as const;

export type TimelapseStyle = (typeof TIMELAPSE_STYLES)[number]["id"];

export const TIMELAPSE_SHAPES = [
  { id: "square", label: "Square", size: { w: 1080, h: 1080 } },
  { id: "vertical", label: "Vertical 9:16", size: { w: 1080, h: 1920 } },
] as const;

export type TimelapseShape = (typeof TIMELAPSE_SHAPES)[number]["id"];

export const TIMELAPSE_LENGTHS = [5, 10, 15] as const;

export type TimelapseLength = (typeof TIMELAPSE_LENGTHS)[number];

export type ExportSettings = {
  format: ExportFormat;
  scale: number;
  layout: SheetLayout;
  sheetData: boolean;
  applyRatio: boolean;
  timelapseStyle: TimelapseStyle;
  timelapseShape: TimelapseShape;
  timelapseLength: TimelapseLength;
};

export const DEFAULT_EXPORT: ExportSettings = {
  format: "png",
  scale: 1,
  layout: "row",
  sheetData: false,
  applyRatio: true,
  timelapseStyle: "colors",
  timelapseShape: "vertical",
  timelapseLength: 10,
};

export const MIN_EXPORT_SCALE = 1;
export const MAX_EXPORT_SCALE = 20;

export const MAX_EXPORT_SIDE = 16384;

export const JPEG_BACKGROUND = "#ffffff";

export const GIF_MAX_COLORS = 255;

export const GIF_MIN_DELAY = 2;

export const GIF_ALPHA_CUTOFF = 128;

export const TIMELAPSE_FPS = 30;

export const TIMELAPSE_LEAD_IN = 0.4;

export const TIMELAPSE_HOLD = 1;

export const TIMELAPSE_OUTRO = 2.8;

export const TIMELAPSE_ART_SHARE = 0.8;

export const TIMELAPSE_SEED = 0x5eed;

export const TIMELAPSE_COLORS = {
  backdrop: "#fcf6f9",
  card: "#ffffff",
  shadow: "rgba(59, 42, 51, 0.16)",
  outro: "#3b2a33",
  wordmark: "#ffffff",
};
