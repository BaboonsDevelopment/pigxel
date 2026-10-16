"use client";

import { zipSync, type Zippable } from "fflate";
import { downloadBlob } from "@/lib/utils/download";
import { assetBlob, assetFramePng, isLocked, type Asset } from "./assets";

const bytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

/**
 * Zips a pack: each asset as a PNG of its first frame, the sprite sheet of
 * every animated one, and its .pigxel file. Throws if any file is locked
 * or fails to download, rather than saving a pack with gaps.
 */
export async function downloadPackZip(packId: string, assets: Asset[]) {
  if (assets.some(isLocked))
    throw new Error("This pack comes with the paid plans.");
  const files: Zippable = {};
  await Promise.all(
    assets.map(async (asset) => {
      const [png, sheet, pigxel] = await Promise.all([
        assetFramePng(asset).then(bytes),
        asset.frames > 1 ? assetBlob(asset.sheetUrl).then(bytes) : null,
        asset.fileUrl ? assetBlob(asset.fileUrl).then(bytes) : null,
      ]);
      files[`${packId}/png/${asset.id}.png`] = png;
      if (sheet) files[`${packId}/sheets/${asset.id}-sheet.png`] = sheet;
      if (pigxel) files[`${packId}/pigxel/${asset.id}.pigxel`] = pigxel;
    }),
  );
  // PNGs are compressed already; store them as they are.
  const zip = zipSync(files, { level: 0 });
  downloadBlob(
    new Blob([zip as Uint8Array<ArrayBuffer>], { type: "application/zip" }),
    `${packId}.zip`,
  );
}
