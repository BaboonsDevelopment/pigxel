import type { PointerEvent } from "react";
import {
  MAX_SCALE,
  MAX_SIZE,
  MIN_FREE_SIDE,
  MIN_SCALE,
  MIN_SIZE,
  SNAPSHOT_BACKGROUND,
  SNAPSHOT_SIDE,
  ZOOM_FACTOR,
  type Area,
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

/** True when every pixel is transparent. */
export function isBlank(image: ImageData): boolean {
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] !== 0) return false;
  }
  return true;
}

/**
 * The fully transparent rectangle with the biggest square inside it, or null
 * when none is at least `MIN_FREE_SIDE` on both sides.
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
  return best && best.w >= MIN_FREE_SIDE && best.h >= MIN_FREE_SIDE
    ? best
    : null;
}

/** An enlarged PNG of the tile on a flat background, for the AI to look at. */
export function tileSnapshot(canvas: HTMLCanvasElement): string {
  const k = Math.max(
    1,
    Math.floor(SNAPSHOT_SIDE / Math.max(canvas.width, canvas.height)),
  );
  const out = document.createElement("canvas");
  out.width = canvas.width * k;
  out.height = canvas.height * k;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = SNAPSHOT_BACKGROUND;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
