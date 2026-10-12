import type { AssetDef } from "./asset.ts";
import { framesOf, sheetOf } from "./pigxel.ts";
import { rect, sprite, stamp, type Sprite } from "./sprite.ts";

const GAP = 4;
const ROW_GAP = 10;
const MAX_W = 1600;
const BACKDROP = "#2b2b33";
const CHECKER = ["#f2f2f5", "#d8d8de"];
const TILE_REPEAT = 3;

export function scaled(s: Sprite, k: number) {
  const out = sprite(s.w * k, s.h * k);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const from = (Math.floor(y / k) * s.w + Math.floor(x / k)) * 4;
      out.data.set(s.data.subarray(from, from + 4), (y * out.w + x) * 4);
    }
  return out;
}

function checker(s: Sprite, cell: number) {
  const out = sprite(s.w, s.h);
  for (let j = 0; j < s.h; j += cell)
    for (let i = 0; i < s.w; i += cell)
      rect(
        out,
        i,
        j,
        Math.min(cell, s.w - i),
        Math.min(cell, s.h - j),
        CHECKER[(i + j) % (cell * 2) ? 1 : 0]!,
      );
  return stamp(out, s);
}

/** A tile repeated n×n, to see whether its edges meet. */
export function tiled(s: Sprite, n = TILE_REPEAT) {
  const out = sprite(s.w * n, s.h * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) stamp(out, s, i * s.w, j * s.h);
  return out;
}

/** The asset's frames side by side at 1×, as uploaded. */
export const stripOf = (asset: AssetDef) => sheetOf(framesOf(asset));

/** Places rows of sprites on a dark backdrop, wrapping long rows. */
function board(rows: Sprite[][]) {
  const placed: { s: Sprite; x: number; y: number }[] = [];
  let y = GAP;
  let width = 0;
  for (const row of rows) {
    let x = GAP;
    let rowH = 0;
    for (const s of row) {
      if (x + s.w > MAX_W && x > GAP) {
        y += rowH + GAP;
        x = GAP;
        rowH = 0;
      }
      placed.push({ s, x, y });
      x += s.w + GAP;
      rowH = Math.max(rowH, s.h);
      width = Math.max(width, x);
    }
    y += rowH + ROW_GAP;
  }
  const out = sprite(width, y);
  rect(out, 0, 0, out.w, out.h, BACKDROP);
  for (const { s, x, y } of placed) stamp(out, s, x, y);
  return out;
}

/**
 * One asset, big enough to judge: each clip's frames on a row, scaled up on
 * a checkerboard, and for tiles a 3×3 repeat of every frame.
 */
export function assetPreview(asset: AssetDef, scale = 8) {
  const cell = Math.max(4, scale * 2);
  const rows = asset.clips.map((clip) =>
    clip.frames.map((f) => checker(scaled(f, scale), cell)),
  );
  if (asset.category === "tiles")
    rows.push(
      asset.clips
        .flatMap((clip) => clip.frames)
        .map((f) => scaled(tiled(f), Math.max(1, Math.round(scale / 2)))),
    );
  return board(rows);
}

/** Every asset, one row each with all its frames. */
export function contactSheet(assets: AssetDef[], scale = 4) {
  return board(
    assets.map((asset) =>
      framesOf(asset).frames.map((f) => checker(scaled(f.sprite, scale), 8)),
    ),
  );
}
