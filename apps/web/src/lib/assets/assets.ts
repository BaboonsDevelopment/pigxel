import { createLayer } from "@/lib/layers/tree";
import type { PigxelDocument } from "@/lib/pigxel-file/format";
import { createFrame } from "@/lib/sprite/frames";
import { ASSETS, type Asset, type AssetCategory } from "./sprites";

export { ASSETS, type Asset, type AssetCategory };

export const ASSET_CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: "characters", label: "Characters" },
  { id: "items", label: "Items" },
  { id: "nature", label: "Nature" },
  { id: "tiles", label: "Tiles" },
];

export function findAsset(id: string | null | undefined): Asset | null {
  return ASSETS.find((asset) => asset.id === id) ?? null;
}

export function assetSize(asset: Asset) {
  const rows = asset.frames[0]!;
  return { w: rows[0]!.length, h: rows.length };
}

/** The colours an asset paints with, as `#rrggbb`, each once. */
export function assetPalette(asset: Asset): string[] {
  return [...new Set(Object.values(asset.colors))];
}

const channels = (color: string) =>
  [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));

/** One frame of the asset as RGBA pixels, row by row from the top-left. */
export function assetPixels(asset: Asset, frame = 0): Uint8ClampedArray {
  const { w, h } = assetSize(asset);
  const pixels = new Uint8ClampedArray(w * h * 4);
  asset.frames[frame]!.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const color = asset.colors[row[x]!];
      if (color) pixels.set([...channels(color), 255], (y * w + x) * 4);
    }
  });
  return pixels;
}

/** Same-colour stretches of a frame's rows, for drawing it as rectangles. */
export function assetRuns(asset: Asset, frame = 0) {
  const runs: { x: number; y: number; w: number; color: string }[] = [];
  asset.frames[frame]!.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const letter = row[x]!;
      let end = x + 1;
      while (row[end] === letter) end++;
      const color = asset.colors[letter];
      if (color) runs.push({ x, y, w: end - x, color });
      x = end;
    }
  });
  return runs;
}

/**
 * A new tile made from the asset: one layer holding its frames, and its
 * colours as the palette. `frames` keeps only that many, e.g. 1 to start
 * an animation from the first.
 */
export function assetDocument(
  asset: Asset,
  { frames: count = asset.frames.length }: { frames?: number } = {},
): PigxelDocument {
  const { w, h } = assetSize(asset);
  const layer = createLayer("normal", asset.name);
  const frames = asset.frames
    .slice(0, Math.max(1, count))
    .map(() => createFrame(asset.duration));
  return {
    id: crypto.randomUUID(),
    width: w,
    height: h,
    background: "transparent",
    layers: [layer],
    frames,
    cels: new Map(
      frames.map((frame, i) => [
        frame.id,
        new Map([[layer.id, assetPixels(asset, i)]]),
      ]),
    ),
    palette: assetPalette(asset),
  };
}

/**
 * The asset as a PNG, `scale` times its size: one `frame`, or else every
 * frame side by side, as a sprite sheet. Browser only.
 */
export function assetPng(
  asset: Asset,
  { scale = 1, frame }: { scale?: number; frame?: number } = {},
): Promise<Blob | null> {
  const { w, h } = assetSize(asset);
  const frames = frame === undefined ? asset.frames.map((_, i) => i) : [frame];
  const sheet = document.createElement("canvas");
  sheet.width = w * frames.length;
  sheet.height = h;
  const ctx = sheet.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  frames.forEach((index, i) =>
    ctx.putImageData(
      new ImageData(
        assetPixels(asset, index) as Uint8ClampedArray<ArrayBuffer>,
        w,
        h,
      ),
      i * w,
      0,
    ),
  );
  const out = document.createElement("canvas");
  out.width = sheet.width * scale;
  out.height = sheet.height * scale;
  const big = out.getContext("2d");
  if (!big) return Promise.resolve(null);
  big.imageSmoothingEnabled = false;
  big.drawImage(sheet, 0, 0, out.width, out.height);
  return new Promise((resolve) => out.toBlob(resolve, "image/png"));
}
