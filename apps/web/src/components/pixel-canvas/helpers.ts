import type { PointerEvent } from "react";
import {
  MAX_SCALE,
  MAX_SIZE,
  MIN_SCALE,
  MIN_SIZE,
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
