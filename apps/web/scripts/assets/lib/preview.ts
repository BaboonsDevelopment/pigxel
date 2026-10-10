import type { PackDef } from "./asset.ts";
import { framesOf } from "./pigxel.ts";
import { rect, sprite, stamp, type Sprite } from "./sprite.ts";

const GAP = 4;
const ROW_GAP = 10;
const MAX_W = 1600;

function scaled(s: Sprite, k: number) {
  const out = sprite(s.w * k, s.h * k);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const from = (Math.floor(y / k) * s.w + Math.floor(x / k)) * 4;
      out.data.set(s.data.subarray(from, from + 4), (y * out.w + x) * 4);
    }
  return out;
}

/** One row per asset with every frame, scaled up, on a checkerboard. */
export function previewSheet(packs: PackDef[], scale = 4, only?: string[]) {
  const rows = packs.flatMap((pack) =>
    pack.assets
      .filter((asset) => !only?.length || only.includes(asset.id))
      .map((asset) =>
        framesOf(asset).frames.map((f) => scaled(f.sprite, scale)),
      ),
  );
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
  rect(out, 0, 0, out.w, out.h, "#2b2b33");
  for (const { s, x, y } of placed) {
    for (let j = 0; j < s.h; j += 8)
      for (let i = 0; i < s.w; i += 8)
        rect(
          out,
          x + i,
          y + j,
          Math.min(8, s.w - i),
          Math.min(8, s.h - j),
          (i + j) % 16 ? "#d8d8de" : "#f2f2f5",
        );
    stamp(out, s, x, y);
  }
  return out;
}
