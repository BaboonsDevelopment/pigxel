"use client";

import { colorsOf } from "@/lib/palette/presets";
import {
  PIGXEL_MIME_TYPE,
  flattenDocument,
  serializePigxel,
  type PigxelDocument,
} from "@/lib/pigxel-file/format";
import { createClient } from "@/lib/supabase/client";
import {
  assetIdFor,
  ASSET_BUCKET,
  ASSET_PACK_COLUMNS,
  PREMIUM_ASSET_BUCKET,
  toAssetPack,
  type AssetKind,
  type AssetPack,
  type AssetPackRow,
  type AssetRow,
} from "./assets";

export { assetIdFor };

export const ASSET_NAME_MAX = 40;
const ASSET_MAX_FRAMES = 64;

export async function listAssetPacksInBrowser(): Promise<AssetPack[]> {
  const { data, error } = await createClient()
    .from("asset_packs")
    .select(ASSET_PACK_COLUMNS)
    .order("sort")
    .order("name")
    .returns<AssetPackRow[]>();
  if (error || !data) throw new Error("Couldn’t load the asset packs.");
  return data.map(toAssetPack);
}

export async function assetExists(id: string): Promise<boolean> {
  const { count, error } = await createClient()
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("id", id);
  if (error) throw new Error("Couldn’t check the assets. Try again.");
  return (count ?? 0) > 0;
}

export function sheetPixels(doc: PigxelDocument) {
  const { width: w, height: h, frames } = doc;
  const sheetW = w * frames.length;
  const pixels = new Uint8ClampedArray(sheetW * h * 4);
  frames.forEach((frame, i) => {
    const flat = flattenDocument(doc, ["reference"], frame.id);
    for (let y = 0; y < h; y++)
      pixels.set(
        flat.subarray(y * w * 4, (y + 1) * w * 4),
        (y * sheetW + i * w) * 4,
      );
  });
  return { pixels, w: sheetW, h };
}

async function contentHash(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest).slice(0, 8)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pngOf({ pixels, w, h }: ReturnType<typeof sheetPixels>) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas
    .getContext("2d")
    ?.putImageData(
      new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, w, h),
      0,
      0,
    );
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Couldn’t draw the sheet.")),
      "image/png",
    ),
  );
}

/**
 * Publishes a picture into a pack. Premium follows the pack: a premium
 * pack's .pigxel files go to the private bucket.
 */
export async function publishAsset({
  id,
  name,
  packId,
  kind,
  document: doc,
  sort,
}: {
  id: string;
  name: string;
  packId: string;
  kind: AssetKind;
  document: PigxelDocument;
  sort?: number;
}): Promise<void> {
  if (doc.frames.length > ASSET_MAX_FRAMES)
    throw new Error(`An asset can have at most ${ASSET_MAX_FRAMES} frames.`);
  const supabase = createClient();
  const { data: pack, error: packError } = await supabase
    .from("asset_packs")
    .select("premium")
    .eq("id", packId)
    .maybeSingle<{ premium: boolean }>();
  if (packError || !pack) throw new Error("Couldn’t find that pack.");
  const { premium } = pack;
  const sheet = sheetPixels(doc);
  const png = await pngOf(sheet);
  const file = new TextEncoder().encode(serializePigxel(doc));
  const [fileHash, sheetHash] = await Promise.all([
    contentHash(file),
    contentHash(await png.arrayBuffer()),
  ]);
  const filePath = `${id}/${fileHash}.pigxel`;
  const sheetPath = `${id}/${sheetHash}.png`;

  const { data: before } = await supabase
    .from("assets")
    .select("file_path, sheet_path, premium")
    .eq("id", id)
    .maybeSingle<Pick<AssetRow, "file_path" | "sheet_path" | "premium">>();
  const storage = supabase.storage.from(ASSET_BUCKET);
  const fileStorage = supabase.storage.from(
    premium ? PREMIUM_ASSET_BUCKET : ASSET_BUCKET,
  );
  const options = { cacheControl: "31536000", upsert: true };
  const uploads = await Promise.all([
    fileStorage.upload(filePath, new Blob([file], { type: PIGXEL_MIME_TYPE }), {
      ...options,
      contentType: PIGXEL_MIME_TYPE,
    }),
    storage.upload(sheetPath, png, { ...options, contentType: "image/png" }),
  ]);
  if (uploads.some((upload) => upload.error))
    throw new Error("Couldn’t upload the asset’s files.");

  const { error } = await supabase.from("assets").upsert({
    id,
    name,
    pack_id: packId,
    kind,
    width: doc.width,
    height: doc.height,
    frame_count: doc.frames.length,
    frame_ms: doc.frames[0]!.duration,
    colors: colorsOf(sheet.pixels, 32),
    file_path: filePath,
    sheet_path: sheetPath,
    premium,
    ...(sort !== undefined && { sort }),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Couldn’t save the asset.");

  if (before?.sheet_path && before.sheet_path !== sheetPath)
    await storage.remove([before.sheet_path]);
  const movedBucket = !!before && before.premium !== premium;
  if (before?.file_path && (movedBucket || before.file_path !== filePath))
    await supabase.storage
      .from(before.premium ? PREMIUM_ASSET_BUCKET : ASSET_BUCKET)
      .remove([before.file_path]);
}
