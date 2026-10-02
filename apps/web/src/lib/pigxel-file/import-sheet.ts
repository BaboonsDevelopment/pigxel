import type { DecodedAnimation } from "@/lib/image/gif-decode";
import type { Rect } from "@/lib/slices/slices";
import { DEFAULT_FRAME_DURATION } from "@/lib/sprite/constants";
import { MAX_PIGXEL_SIZE } from "./format";
import { pixelScale, unscaled } from "./import-image";

/** How a sprite sheet is cut into frames, as Aseprite's Import Sprite Sheet asks. */
export type SheetGrid = {
  /** One frame's size, in pixels. */
  frameW: number;
  frameH: number;
  /** Where the first frame starts. */
  offsetX: number;
  offsetY: number;
  /** Empty space between frames. */
  gapX: number;
  gapY: number;
  /** Leaves out cells with nothing drawn, e.g. the end of the last row. */
  skipEmpty: boolean;
  /** How long each frame shows, in milliseconds. */
  duration: number;
};

export type Picture = { rgba: Uint8ClampedArray; w: number; h: number };

/**
 * The sheet at its own size: a sheet exported enlarged (Scale 4× makes every
 * pixel a 4 × 4 block) comes back to one pixel per pixel; `scale` says by how much.
 */
export function nativeSheet(picture: Picture): {
  picture: Picture;
  scale: number;
} {
  const anim = {
    w: picture.w,
    h: picture.h,
    frames: [{ rgba: picture.rgba, duration: 0 }],
  };
  const scale = pixelScale(anim);
  const small = unscaled(anim, scale);
  return {
    picture: { rgba: small.frames[0]!.rgba, w: small.w, h: small.h },
    scale,
  };
}

/**
 * How different the sheet is from itself moved `shift` pixels along it
 * (across for a row of frames, down for a column), on average per pixel.
 * Moved by one frame, an animation lands on frames that look alike.
 */
function shiftDifference(picture: Picture, shift: number, across: boolean) {
  const { rgba, w, h } = picture;
  const [spanX, spanY] = across ? [w - shift, h] : [w, h - shift];
  if (spanX < 1 || spanY < 1) return Infinity;
  // Big sheets are sampled, every few pixels.
  const step = Math.max(1, Math.floor(Math.sqrt((spanX * spanY) / 65536)));
  const offset = (across ? shift : shift * w) * 4;
  let total = 0;
  let pixels = 0;
  for (let y = 0; y < spanY; y += step)
    for (let x = 0; x < spanX; x += step) {
      const a = (y * w + x) * 4;
      for (let c = 0; c < 4; c++)
        total += Math.abs(rgba[a + c]! - rgba[a + offset + c]!);
      pixels++;
    }
  return total / pixels;
}

/**
 * The frame size along one direction of the sheet (across or down), or
 * null when the sheet doesn't repeat that way. A size that divides the
 * sheet evenly counts when the sheet moved by it looks much more like itself
 * than moved by half of it: true for the real frame size, not for its
 * multiples (moved by half of those, it also matches) or for a picture that
 * isn't a sheet. The most alike of those wins.
 */
function repeatSize(picture: Picture, across: boolean): number | null {
  const length = across ? picture.w : picture.h;
  let best: { size: number; score: number } | null = null;
  for (let size = 4; size < length; size++) {
    if (length % size || size > MAX_PIGXEL_SIZE) continue;
    const score = shiftDifference(picture, size, across);
    const half = shiftDifference(picture, Math.round(size / 2), across);
    if (score < half * 0.5 && (!best || score < best.score))
      best = { size, score };
  }
  return best?.size ?? null;
}

/**
 * A first guess at a sheet's grid: frames in a row, a column or a grid,
 * found by how the sheet repeats across and down (see repeatSize). Where it
 * doesn't repeat, a frame is as wide or as tall as the whole picture.
 */
export function guessSheetGrid(picture: Picture): SheetGrid {
  const { w, h } = picture;
  const frame = {
    w: repeatSize(picture, true) ?? w,
    h: repeatSize(picture, false) ?? h,
  };
  return {
    frameW: frame.w,
    frameH: frame.h,
    offsetX: 0,
    offsetY: 0,
    gapX: 0,
    gapY: 0,
    skipEmpty: true,
    duration: DEFAULT_FRAME_DURATION,
  };
}

/** What is wrong with a grid for a picture of `w × h`, or null when it can be cut. */
export function sheetGridProblem(grid: SheetGrid, w: number, h: number) {
  if (grid.frameW < 1 || grid.frameH < 1)
    return "A frame must be at least 1 × 1 px.";
  if (grid.frameW > MAX_PIGXEL_SIZE || grid.frameH > MAX_PIGXEL_SIZE)
    return `A frame can be at most ${MAX_PIGXEL_SIZE} × ${MAX_PIGXEL_SIZE} px, the largest tile.`;
  if (!sheetCells(grid, w, h).length)
    return "No whole frame fits in the picture: check the frame size and offset.";
  return null;
}

/** Where each whole frame is on the sheet, row by row. */
export function sheetCells(grid: SheetGrid, w: number, h: number): Rect[] {
  const { frameW, frameH, offsetX, offsetY, gapX, gapY } = grid;
  if (frameW < 1 || frameH < 1) return [];
  const cells: Rect[] = [];
  for (let y = offsetY; y + frameH <= h; y += frameH + Math.max(0, gapY))
    for (let x = offsetX; x + frameW <= w; x += frameW + Math.max(0, gapX))
      if (x >= 0 && y >= 0) cells.push({ x, y, w: frameW, h: frameH });
  return cells;
}

/** The sheet cut into frames, row by row, each shown for the grid's duration. */
export function cutSheet(picture: Picture, grid: SheetGrid): DecodedAnimation {
  const frames = sheetCells(grid, picture.w, picture.h).flatMap((cell) => {
    const rgba = new Uint8ClampedArray(cell.w * cell.h * 4);
    let drawn = false;
    for (let y = 0; y < cell.h; y++) {
      const from = ((cell.y + y) * picture.w + cell.x) * 4;
      const row = picture.rgba.subarray(from, from + cell.w * 4);
      rgba.set(row, y * cell.w * 4);
      if (!drawn)
        for (let a = 3; a < row.length; a += 4) if (row[a]) drawn = true;
    }
    return grid.skipEmpty && !drawn ? [] : [{ rgba, duration: grid.duration }];
  });
  return { w: grid.frameW, h: grid.frameH, frames };
}
