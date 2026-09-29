import type { PointerEvent } from "react";
import {
  MAX_SCALE,
  MAX_SIZE,
  MIN_PLACEMENT_SIDE,
  MIN_SCALE,
  MIN_SIZE,
  SNAPSHOT_BACKGROUND,
  SNAPSHOT_SIDE,
  ZOOM_FACTOR,
  type Area,
  type FrameEdges,
  type ResizeDrag,
  type Size,
} from "./constants";
import type { Point } from "./pen";

export function clampSize(value: number) {
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, value));
}

export function sameSize(a: Size, b: Size) {
  return a.w === b.w && a.h === b.h;
}

/** The tile pixel under the pointer, whatever the zoom. */
export function pixelAt(e: PointerEvent<HTMLCanvasElement>): Point {
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width),
    y: Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height),
  };
}

/** The tile size a resize handle points at after moving to the pointer. */
export function resizeTo(
  drag: ResizeDrag,
  e: PointerEvent<HTMLElement>,
  scale: number,
): Size {
  return {
    w:
      drag.edge === "s"
        ? drag.w
        : clampSize(drag.w + Math.round((e.clientX - drag.x) / scale)),
    h:
      drag.edge === "e"
        ? drag.h
        : clampSize(drag.h + Math.round((e.clientY - drag.y) / scale)),
  };
}

/** The next zoom level for a wheel step; scrolling up zooms in. */
export function zoom(scale: number, deltaY: number): number {
  const next = deltaY < 0 ? scale * ZOOM_FACTOR : scale / ZOOM_FACTOR;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
}

/** The rectangle spanned by two corner pixels, clipped to the tile. */
export function areaBetween(a: Point, b: Point, size: Size): Area {
  const clampX = (v: number) => Math.max(0, Math.min(size.w - 1, v));
  const clampY = (v: number) => Math.max(0, Math.min(size.h - 1, v));
  const x0 = clampX(Math.min(a.x, b.x));
  const y0 = clampY(Math.min(a.y, b.y));
  const x1 = clampX(Math.max(a.x, b.x));
  const y1 = clampY(Math.max(a.y, b.y));
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * A copy of `image` where pixels of the tile's solid background colour count
 * as transparent, so emptiness checks work on white or black tiles too.
 */
export function withoutBackground(
  image: ImageData,
  background: [number, number, number] | null,
): ImageData {
  if (!background) return image;
  const [r, g, b] = background;
  const copy = new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );
  const data = copy.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === r && data[i + 1] === g && data[i + 2] === b)
      data[i + 3] = 0;
  }
  return copy;
}

/** True when every pixel is transparent. */
export function isBlank(image: ImageData): boolean {
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] !== 0) return false;
  }
  return true;
}

/**
 * The fully transparent rectangle with the biggest square inside it, or null
 * when none is at least `MIN_PLACEMENT_SIDE` on both sides.
 */
export function largestEmptyArea(image: ImageData): Area | null {
  const { width: w, height: h, data } = image;
  // Per column: how many transparent pixels are stacked up to the current row.
  const heights = new Array<number>(w + 1).fill(0);
  let best: Area | null = null;
  const score = (a: Area) => Math.min(a.w, a.h) * 1e6 + a.w * a.h;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      heights[x] = data[(y * w + x) * 4 + 3] === 0 ? (heights[x] ?? 0) + 1 : 0;
    }
    // Largest rectangles under the histogram of `heights`.
    const stack: number[] = [];
    for (let x = 0; x <= w; x++) {
      const current = heights[x] ?? 0;
      while (stack.length && (heights[stack.at(-1)!] ?? 0) >= current) {
        const top = heights[stack.pop()!] ?? 0;
        const left = stack.length ? stack.at(-1)! + 1 : 0;
        const area = { x: left, y: y - top + 1, w: x - left, h: top };
        if (area.w && area.h && (!best || score(area) > score(best))) {
          best = area;
        }
      }
      stack.push(x);
    }
  }
  return best && best.w >= MIN_PLACEMENT_SIDE && best.h >= MIN_PLACEMENT_SIDE
    ? best
    : null;
}

/**
 * An enlarged PNG of the tile (or an `area` of it) on a flat background, for
 * the AI to look at or redraw.
 */
export function tileSnapshot(
  canvas: HTMLCanvasElement,
  area: Area = { x: 0, y: 0, w: canvas.width, h: canvas.height },
  background = SNAPSHOT_BACKGROUND,
): string {
  const k = Math.max(1, Math.floor(SNAPSHOT_SIDE / Math.max(area.w, area.h)));
  const out = document.createElement("canvas");
  out.width = area.w * k;
  out.height = area.h * k;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    canvas,
    area.x,
    area.y,
    area.w,
    area.h,
    0,
    0,
    out.width,
    out.height,
  );
  return out.toDataURL("image/png");
}

/**
 * Grows `area` around its centre to at least `MIN_PLACEMENT_SIDE` a side
 * (or the whole tile, if that is smaller), keeping it inside the tile.
 */
export function atLeastPlacementSize(area: Area, tile: Size): Area {
  const grow = (pos: number, len: number, max: number) => {
    const next = Math.min(max, Math.max(len, MIN_PLACEMENT_SIDE));
    const start = Math.round(pos - (next - len) / 2);
    return [Math.max(0, Math.min(max - next, start)), next] as const;
  };
  const [x, w] = grow(area.x, area.w, tile.w);
  const [y, h] = grow(area.y, area.h, tile.h);
  return { x, y, w, h };
}

/**
 * `start` with the dragged `edges` moved by `dx × dy` tile pixels, kept inside
 * the tile and no smaller than `MIN_PLACEMENT_SIDE` (or the tile).
 */
export function adjustFrame(
  start: Area,
  edges: FrameEdges,
  dx: number,
  dy: number,
  tile: Size,
): Area {
  const axis = (
    pos: number,
    len: number,
    delta: number,
    low: boolean,
    high: boolean,
    max: number,
  ) => {
    const min = Math.min(MIN_PLACEMENT_SIDE, max);
    if (low && high) {
      return [Math.max(0, Math.min(max - len, pos + delta)), len] as const;
    }
    let from = pos;
    let to = pos + len;
    if (low) from = Math.max(0, Math.min(to - min, from + delta));
    if (high) to = Math.min(max, Math.max(from + min, to + delta));
    return [from, to - from] as const;
  };
  const [x, w] = axis(start.x, start.w, dx, edges.left, edges.right, tile.w);
  const [y, h] = axis(start.y, start.h, dy, edges.top, edges.bottom, tile.h);
  return { x, y, w, h };
}

export function sameArea(a: Area, b: Area) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
