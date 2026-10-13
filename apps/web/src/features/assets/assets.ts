import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePigxel, type PigxelDocument } from "@/lib/pigxel-file/format";

export type AssetKind = "sprite" | "tile";

export type AssetBlock = { id: string; name: string; count: number };

export const ASSET_BLOCK_COLUMNS = "id, name, assets(count)";

export type AssetBlockRow = {
  id: string;
  name: string;
  assets: { count: number }[];
};

export const toAssetBlock = (row: AssetBlockRow): AssetBlock => ({
  id: row.id,
  name: row.name,
  count: row.assets[0]?.count ?? 0,
});

export const ASSET_BUCKET = "assets";
/** Private: premium .pigxel files, readable on paid plans only. */
export const PREMIUM_ASSET_BUCKET = "premium-assets";

export const ASSET_COLUMNS =
  "id, name, category, kind, width, height, frame_count, frame_ms, colors, file_path, sheet_path, sort, premium";

export type AssetRow = {
  id: string;
  name: string;
  category: string;
  kind: AssetKind;
  width: number;
  height: number;
  frame_count: number;
  frame_ms: number;
  colors: string[];
  file_path: string;
  sheet_path: string;
  sort: number;
  premium: boolean;
};

export type Asset = {
  id: string;
  name: string;
  category: string;
  kind: AssetKind;
  width: number;
  height: number;
  frames: number;
  frameMs: number;
  colors: string[];
  premium: boolean;
  /** Null when it's premium and the viewer isn't on a paid plan. */
  fileUrl: string | null;
  sheetUrl: string;
};

export function assetFileUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${ASSET_BUCKET}/${path}`;
}

/** Premium assets the viewer may only preview. */
export const isLocked = (asset: Pick<Asset, "premium" | "fileUrl">) =>
  asset.premium && !asset.fileUrl;

export function toAsset(
  row: AssetRow,
  signed = new Map<string, string>(),
): Asset {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    kind: row.kind,
    width: row.width,
    height: row.height,
    frames: row.frame_count,
    frameMs: row.frame_ms,
    colors: row.colors,
    premium: row.premium,
    fileUrl: row.premium
      ? (signed.get(row.file_path) ?? null)
      : assetFileUrl(row.file_path),
    sheetUrl: assetFileUrl(row.sheet_path),
  };
}

const SIGNED_FOR = 60 * 60;

/**
 * Turns rows into assets, with short-lived links to the premium files the
 * viewer's session may read. Storage policies decide: on Free there are none.
 */
export async function toAssets(
  client: Pick<SupabaseClient, "storage">,
  rows: AssetRow[],
): Promise<Asset[]> {
  const paths = rows.filter((row) => row.premium).map((row) => row.file_path);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await client.storage
      .from(PREMIUM_ASSET_BUCKET)
      .createSignedUrls(paths, SIGNED_FOR);
    for (const item of data ?? [])
      if (item.path && item.signedUrl && !item.error)
        signed.set(item.path, item.signedUrl);
  }
  return rows.map((row) => toAsset(row, signed));
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
  if (!asset.fileUrl) throw new Error("This asset is for paid plans.");
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
