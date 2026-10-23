import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePigxel, type PigxelDocument } from "@/lib/pigxel-file/format";

export type AssetKind = "sprite" | "tile";

/** A set of assets made together, such as "Dungeon Heroes". */
export type AssetPack = {
  id: string;
  name: string;
  count: number;
  background: string | null;
  description: string | null;
  /** Paid plans only: every asset in it is premium. */
  premium: boolean;
  createdAt: string;
  /** When the team pinned it to the top of the Packs tab; null when not. */
  pinnedAt: string | null;
};

export const ASSET_PACK_COLUMNS =
  "id, name, background, description, premium, created_at, pinned_at, assets(count)";

export type AssetPackRow = {
  id: string;
  name: string;
  background: string | null;
  description: string | null;
  premium: boolean;
  created_at: string;
  pinned_at: string | null;
  assets: { count: number }[];
};

export const toAssetPack = (row: AssetPackRow): AssetPack => ({
  id: row.id,
  name: row.name,
  count: row.assets[0]?.count ?? 0,
  background: row.background,
  description: row.description,
  premium: row.premium,
  createdAt: row.created_at,
  pinnedAt: row.pinned_at,
});

export const ASSET_BUCKET = "assets";
/** Private: premium .pigxel files, readable on paid plans only. */
export const PREMIUM_ASSET_BUCKET = "premium-assets";

export const ASSET_COLUMNS =
  "id, name, pack_id, kind, width, height, frame_count, frame_ms, colors, file_path, sheet_path, sort, premium, uses, asset_tag_links(tag_id)";

export type AssetRow = {
  id: string;
  name: string;
  pack_id: string;
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
  uses?: number;
  asset_tag_links?: { tag_id: string }[];
};

export type Asset = {
  id: string;
  name: string;
  packId: string;
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
  /** How many people started a tile from it, downloaded or copied it. */
  uses: number;
  /** Tag ids. */
  tags: string[];
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
    packId: row.pack_id,
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
    uses: row.uses ?? 0,
    tags: (row.asset_tag_links ?? []).map((link) => link.tag_id),
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

/** An id from a name: lowercase words joined by dashes, at most 40. */
export function assetIdFor(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}
