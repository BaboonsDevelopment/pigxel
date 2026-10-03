import { parsePigxel, type PigxelDocument } from "@/lib/pigxel-file/format";

export type AssetCategory = "characters" | "items" | "nature" | "tiles";

export const ASSET_CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: "characters", label: "Characters" },
  { id: "items", label: "Items" },
  { id: "nature", label: "Nature" },
  { id: "tiles", label: "Tiles" },
];

export const ASSET_BUCKET = "assets";

export const ASSET_COLUMNS =
  "id, name, category, width, height, frame_count, frame_ms, colors, file_path, sheet_path, sort";

export type AssetRow = {
  id: string;
  name: string;
  category: AssetCategory;
  width: number;
  height: number;
  frame_count: number;
  frame_ms: number;
  colors: string[];
  file_path: string;
  sheet_path: string;
  sort: number;
};

export type Asset = {
  id: string;
  name: string;
  category: AssetCategory;
  width: number;
  height: number;
  frames: number;
  frameMs: number;
  colors: string[];
  fileUrl: string;
  sheetUrl: string;
};

export function isAssetCategory(value: unknown): value is AssetCategory {
  return ASSET_CATEGORIES.some((c) => c.id === value);
}

export function assetFileUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${ASSET_BUCKET}/${path}`;
}

export function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    width: row.width,
    height: row.height,
    frames: row.frame_count,
    frameMs: row.frame_ms,
    colors: row.colors,
    fileUrl: assetFileUrl(row.file_path),
    sheetUrl: assetFileUrl(row.sheet_path),
  };
}

export function keepFrames(doc: PigxelDocument, count: number): PigxelDocument {
  const frames = doc.frames.slice(0, Math.max(1, count));
  return {
    ...doc,
    frames,
    cels: new Map(frames.map((f) => [f.id, doc.cels.get(f.id) ?? new Map()])),
  };
}

export async function loadAssetDocument(
  asset: Pick<Asset, "fileUrl">,
  { frames }: { frames?: number } = {},
): Promise<PigxelDocument> {
  const response = await fetch(asset.fileUrl);
  if (!response.ok) throw new Error("Couldn’t load this asset.");
  const doc = parsePigxel(await response.text());
  const kept = frames ? keepFrames(doc, frames) : doc;
  return { ...kept, id: crypto.randomUUID() };
}

export async function loadAssetFrame(
  asset: Pick<Asset, "sheetUrl" | "width" | "height">,
): Promise<{ pixels: Uint8ClampedArray; w: number; h: number }> {
  const ctx = (await frameCanvas(asset)).getContext("2d")!;
  const { data } = ctx.getImageData(0, 0, asset.width, asset.height);
  return { pixels: data, w: asset.width, h: asset.height };
}

export async function assetFramePng(
  asset: Pick<Asset, "sheetUrl" | "width" | "height">,
): Promise<Blob> {
  const canvas = await frameCanvas(asset);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Couldn’t copy this asset.")),
      "image/png",
    ),
  );
}

export async function assetBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Couldn’t download this asset.");
  return response.blob();
}

async function frameCanvas(
  asset: Pick<Asset, "sheetUrl" | "width" | "height">,
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(await assetBlob(asset.sheetUrl));
  try {
    const canvas = document.createElement("canvas");
    canvas.width = asset.width;
    canvas.height = asset.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    ctx.drawImage(bitmap, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}
