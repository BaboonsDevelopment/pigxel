import {
  DEFAULT_EXPORT,
  EXPORT_FORMATS,
  MAX_EXPORT_SCALE,
  MAX_SHEET_PADDING,
  MIN_EXPORT_SCALE,
  SHEET_JSONS,
  SHEET_LAYOUTS,
  SHEET_SPLITS,
  TIMELAPSE_LENGTHS,
  TIMELAPSE_SHAPES,
  TIMELAPSE_STYLES,
  type ExportSettings,
} from "./constants";

const exportKey = (userId: string, tileId: string) =>
  `pigxel:export:v1:${userId}:${tileId}`;

const pick = <T>(list: readonly { id: T }[], value: unknown, fallback: T) =>
  list.find((option) => option.id === value)?.id ?? fallback;

const whole = (value: unknown, min: number, max: number, fallback: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max
    ? (value as number)
    : fallback;

const flag = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export function readExportSettings(raw: unknown): ExportSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_EXPORT;
  const v = raw as Record<string, unknown>;
  const d = DEFAULT_EXPORT;
  return {
    format: pick(EXPORT_FORMATS, v.format, d.format),
    scale: whole(v.scale, MIN_EXPORT_SCALE, MAX_EXPORT_SCALE, d.scale),
    layout: pick(SHEET_LAYOUTS, v.layout, d.layout),
    partSelection: flag(v.partSelection, d.partSelection),
    partLayers:
      Array.isArray(v.partLayers) &&
      v.partLayers.every((id) => typeof id === "string")
        ? (v.partLayers as string[])
        : null,
    partTag: typeof v.partTag === "string" ? v.partTag : null,
    sheetData: flag(v.sheetData, d.sheetData),
    sheetJson: pick(SHEET_JSONS, v.sheetJson, d.sheetJson),
    sheetSplit: pick(SHEET_SPLITS, v.sheetSplit, d.sheetSplit),
    sheetBorder: whole(v.sheetBorder, 0, MAX_SHEET_PADDING, d.sheetBorder),
    sheetSpacing: whole(v.sheetSpacing, 0, MAX_SHEET_PADDING, d.sheetSpacing),
    sheetInner: whole(v.sheetInner, 0, MAX_SHEET_PADDING, d.sheetInner),
    sheetTrim: flag(v.sheetTrim, d.sheetTrim),
    sheetMerge: flag(v.sheetMerge, d.sheetMerge),
    sheetSkipEmpty: flag(v.sheetSkipEmpty, d.sheetSkipEmpty),
    applyRatio: flag(v.applyRatio, d.applyRatio),
    timelapseStyle: pick(TIMELAPSE_STYLES, v.timelapseStyle, d.timelapseStyle),
    timelapseShape: pick(TIMELAPSE_SHAPES, v.timelapseShape, d.timelapseShape),
    timelapseLength:
      TIMELAPSE_LENGTHS.find((n) => n === v.timelapseLength) ??
      d.timelapseLength,
  };
}

export function loadExportSettings(
  userId: string,
  tileId: string,
): ExportSettings {
  try {
    return readExportSettings(
      JSON.parse(localStorage.getItem(exportKey(userId, tileId)) ?? "null"),
    );
  } catch {
    return DEFAULT_EXPORT;
  }
}

export function keepExportSettings(
  userId: string,
  tileId: string,
  settings: ExportSettings,
) {
  try {
    localStorage.setItem(exportKey(userId, tileId), JSON.stringify(settings));
  } catch {}
}
