import { components, type Component } from "@/lib/edit/objects";
import { cropBitmap, type Bitmap, type Size } from "./bitmap";
import { decodeImage } from "./decode";
import { imageToSprite } from "./quantize";
import { cutOutBackground } from "./steps/cut-out-background";
import { recoverPixelGrid } from "./steps/recover-pixel-grid";
import { removeStrayPixels } from "./steps/remove-stray-pixels";
import { paletteSize } from "./steps/shrink-to-tile";

/** How a sprite sheet is divided: `cols × rows` equal cells, read row by row. */
export type Grid = { cols: number; rows: number };

/** Specks smaller than this (in sheet pixels) are noise, not part of a pose. */
const MIN_PART = 3;

/** An empty `w × h` bitmap. */
const blank = (w: number, h: number): Bitmap => ({
  rgba: new Uint8ClampedArray(w * h * 4),
  w,
  h,
});

/** Copies `from` into `to` with its top-left at `x`, `y`, clipped to `to`. */
function paste(to: Bitmap, from: Bitmap, x: number, y: number) {
  for (let row = 0; row < from.h; row++) {
    const ty = y + row;
    if (ty < 0 || ty >= to.h) continue;
    for (let col = 0; col < from.w; col++) {
      const tx = x + col;
      if (tx < 0 || tx >= to.w) continue;
      const i = (row * from.w + col) * 4;
      if (from.rgba[i + 3])
        to.rgba.set(from.rgba.subarray(i, i + 4), (ty * to.w + tx) * 4);
    }
  }
}

/**
 * The poses of a cut-out sprite sheet, one per cell: each separate drawn
 * thing goes to the cell its centre lies in, so a pose reaching a little
 * past its cell stays whole. Cells with nothing drawn give null.
 */
export function splitSheet(
  image: Bitmap,
  grid: Grid,
  count: number,
): (Bitmap | null)[] {
  const cellW = image.w / grid.cols;
  const cellH = image.h / grid.rows;
  const cells: Component[][] = Array.from({ length: count }, () => []);
  for (const part of components(image.rgba, image.w, image.h)) {
    if (part.members.length < MIN_PART) continue;
    const col = Math.floor((part.box.x + part.box.w / 2) / cellW);
    const row = Math.floor((part.box.y + part.box.h / 2) / cellH);
    const index =
      Math.min(grid.rows - 1, row) * grid.cols + Math.min(grid.cols - 1, col);
    cells[index]?.push(part);
  }
  return cells.map((parts) => {
    if (!parts.length) return null;
    const x0 = Math.min(...parts.map((p) => p.box.x));
    const y0 = Math.min(...parts.map((p) => p.box.y));
    const x1 = Math.max(...parts.map((p) => p.box.x + p.box.w));
    const y1 = Math.max(...parts.map((p) => p.box.y + p.box.h));
    const pose = blank(x1 - x0, y1 - y0);
    for (const i of parts.flatMap((p) => p.members)) {
      const x = (i % image.w) - x0;
      const y = Math.floor(i / image.w) - y0;
      pose.rgba.set(
        image.rgba.subarray(i * 4, i * 4 + 4),
        (y * pose.w + x) * 4,
      );
    }
    return pose;
  });
}

/**
 * Pixel art frames of `box` size from the cut-out poses. All poses shrink by
 * one factor, so the subject keeps its size from frame to frame, and share
 * one palette; each stands centred on the bottom edge of its frame, so it
 * does not jump around. Missing poses stay null.
 */
export function posesToFrames(
  poses: (Bitmap | null)[],
  box: Size,
): (Bitmap | null)[] {
  const present = poses.filter((p): p is Bitmap => !!p);
  if (!present.length) return poses.map(() => null);
  const slotW = Math.max(...present.map((p) => p.w));
  const slotH = Math.max(...present.map((p) => p.h));
  // Every pose in a slot of one strip, so one pass gives one palette.
  const strip = blank(slotW * present.length, slotH);
  present.forEach((p, i) =>
    paste(strip, p, i * slotW + Math.floor((slotW - p.w) / 2), slotH - p.h),
  );
  const k = Math.min(box.w / slotW, box.h / slotH);
  const w = Math.max(1, Math.round(slotW * k));
  const h = Math.max(1, Math.round(slotH * k));
  const { buf } = imageToSprite(
    strip.rgba,
    strip.w,
    strip.h,
    w * present.length,
    h,
    { colors: paletteSize({ w, h }), keepBackground: true, fit: "stretch" },
  );
  const small: Bitmap = { rgba: buf, w: w * present.length, h };

  let next = 0;
  return poses.map((pose) => {
    if (!pose) return null;
    const slot = removeStrayPixels(
      cropBitmap(small, { x: next++ * w, y: 0, w, h }),
    );
    const frame = blank(box.w, box.h);
    paste(frame, slot, Math.floor((box.w - w) / 2), box.h - h);
    return frame;
  });
}

/**
 * A sprite sheet from the image model turned into `count` pixel art frames
 * of `box` size (null where a cell is empty). Browser-only: decoding needs a
 * canvas.
 */
export async function sheetToFrames(
  source: Blob,
  grid: Grid,
  count: number,
  box: Size,
): Promise<(Bitmap | null)[]> {
  const target = Math.max(box.w * grid.cols, box.h * grid.rows);
  const decoded = await decodeImage(source, target);
  const sheet = recoverPixelGrid(cutOutBackground(decoded));
  return posesToFrames(splitSheet(sheet, grid, count), box);
}
