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
  ASSET_BUCKET,
  ASSET_COLUMNS,
  toAsset,
  type Asset,
  type AssetCategory,
  type AssetRow,
} from "./assets";

export const ASSET_NAME_MAX = 40;
const ASSET_MAX_FRAMES = 64;

export async function listAssetsInBrowser(): Promise<Asset[]> {
  const { data, error } = await createClient()
    .from("assets")
    .select(ASSET_COLUMNS)
    .order("sort")
    .order("name")
    .returns<AssetRow[]>();
  if (error || !data) throw new Error("Couldn’t load the assets.");
  return data.map(toAsset);
}

export async function assetExists(id: string): Promise<boolean> {
  const { count, error } = await createClient()
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("id", id);
  if (error) throw new Error("Couldn’t check the assets. Try again.");
  return (count ?? 0) > 0;
}

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

export async function publishAsset({
  id,
  name,
  category,
  document: doc,
  sort,
}: {
  id: string;
  name: string;
  category: AssetCategory;
  document: PigxelDocument;
  sort?: number;
}): Promise<void> {
  if (doc.frames.length > ASSET_MAX_FRAMES)
    throw new Error(`An asset can have at most ${ASSET_MAX_FRAMES} frames.`);
  const supabase = createClient();
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
    .select("file_path, sheet_path")
    .eq("id", id)
    .maybeSingle<Pick<AssetRow, "file_path" | "sheet_path">>();
  const storage = supabase.storage.from(ASSET_BUCKET);
  const options = { cacheControl: "31536000", upsert: true };
  const uploads = await Promise.all([
    storage.upload(filePath, new Blob([file], { type: PIGXEL_MIME_TYPE }), {
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
    category,
    width: doc.width,
    height: doc.height,
    frame_count: doc.frames.length,
    frame_ms: doc.frames[0]!.duration,
    colors: colorsOf(sheet.pixels, 32),
    file_path: filePath,
    sheet_path: sheetPath,
    ...(sort !== undefined && { sort }),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Couldn’t save the asset.");

  const replaced = [before?.file_path, before?.sheet_path].filter(
    (path): path is string => !!path && path !== filePath && path !== sheetPath,
  );
  if (replaced.length) await storage.remove(replaced);
}
