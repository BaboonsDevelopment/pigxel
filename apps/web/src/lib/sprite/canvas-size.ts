import { clipToTile, type Slice } from "@/lib/slices/slices";

/**
 * Canvas size, as Aseprite's Sprite › Canvas Size: the tile grows or shrinks
 * by adding or cutting away space on any side, without scaling the drawing.
 */

/** Pixels added on each side; negative cuts that many away. */
export type Borders = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** Which part of the tile stays put, as a fraction across and down: 0, ½ or 1. */
export type Anchor = { x: 0 | 0.5 | 1; y: 0 | 0.5 | 1 };

/** The 3 × 3 anchors, row by row from the top-left. */
export const ANCHORS: Anchor[] = [0, 0.5, 1].flatMap((y) =>
  [0, 0.5, 1].map((x) => ({ x, y }) as Anchor),
);

export const sameAnchor = (a: Anchor, b: Anchor) => a.x === b.x && a.y === b.y;

export const NO_BORDERS: Borders = { left: 0, top: 0, right: 0, bottom: 0 };

/**
 * The borders that make a `w × h` tile `next`, with the drawing kept at
 * `anchor`: centred, an odd pixel goes to the right and the bottom.
 */
export function bordersFor(
  size: { w: number; h: number },
  next: { w: number; h: number },
  anchor: Anchor,
): Borders {
  const dw = next.w - size.w;
  const dh = next.h - size.h;
  const left = Math.floor(dw * anchor.x);
  const top = Math.floor(dh * anchor.y);
  return { left, top, right: dw - left, bottom: dh - top };
}

/** The size of a `w × h` tile with `borders` added. */
export function sizeWith(
  size: { w: number; h: number },
  borders: Borders,
): { w: number; h: number } {
  return {
    w: size.w + borders.left + borders.right,
    h: size.h + borders.top + borders.bottom,
  };
}

/** Slices moved with the drawing by (`dx`, `dy`) and cut to a `w × h` tile; ones left outside go. */
export function movedSlices(
  slices: Slice[],
  dx: number,
  dy: number,
  w: number,
  h: number,
): Slice[] {
  return slices.flatMap((slice) => {
    const moved = {
      ...slice.bounds,
      x: slice.bounds.x + dx,
      y: slice.bounds.y + dy,
    };
    const bounds = clipToTile(moved, w, h);
    if (!bounds) return [];
    // The centre and pivot are relative to the bounds, whose corner may have moved in.
    const cutX = bounds.x - moved.x;
    const cutY = bounds.y - moved.y;
    const center =
      slice.center &&
      clipToTile(
        { ...slice.center, x: slice.center.x - cutX, y: slice.center.y - cutY },
        bounds.w,
        bounds.h,
      );
    const pivot = slice.pivot && {
      x: slice.pivot.x - cutX,
      y: slice.pivot.y - cutY,
    };
    const pivotInside =
      pivot &&
      pivot.x >= 0 &&
      pivot.y >= 0 &&
      pivot.x < bounds.w &&
      pivot.y < bounds.h;
    return [{ ...slice, bounds, center, pivot: pivotInside ? pivot : null }];
  });
}

/**
 * The smallest rectangle holding everything drawn in any of `pictures`
 * (frames of a `w × h` tile), for Trim; null when nothing is drawn. Clear
 * pixels count as empty, and so does `background` (an [r, g, b] colour),
 * the Background layer's fill.
 */
export function drawnBounds(
  pictures: Uint8ClampedArray[],
  w: number,
  h: number,
  background: readonly [number, number, number] | null = null,
): { x: number; y: number; w: number; h: number } | null {
  let left = w;
  let top = h;
  let right = -1;
  let bottom = -1;
  for (const rgba of pictures)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const at = (y * w + x) * 4;
        const empty =
          rgba[at + 3] === 0 ||
          (background !== null &&
            rgba[at] === background[0] &&
            rgba[at + 1] === background[1] &&
            rgba[at + 2] === background[2]);
        if (empty) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
  return right < 0
    ? null
    : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}
