import { clipToTile, type Slice } from "@/lib/slices/slices";

export type Borders = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Anchor = { x: 0 | 0.5 | 1; y: 0 | 0.5 | 1 };

export const ANCHORS: Anchor[] = [0, 0.5, 1].flatMap((y) =>
  [0, 0.5, 1].map((x) => ({ x, y }) as Anchor),
);

export const sameAnchor = (a: Anchor, b: Anchor) => a.x === b.x && a.y === b.y;

export const NO_BORDERS: Borders = { left: 0, top: 0, right: 0, bottom: 0 };

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

export function sizeWith(
  size: { w: number; h: number },
  borders: Borders,
): { w: number; h: number } {
  return {
    w: size.w + borders.left + borders.right,
    h: size.h + borders.top + borders.bottom,
  };
}

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
