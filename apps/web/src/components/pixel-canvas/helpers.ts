import type { PointerEvent } from "react";
import {
  MAX_SIZE,
  MIN_SIZE,
  SCALE,
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

/** The tile pixel under the pointer. */
export function pixelAt(e: PointerEvent<HTMLCanvasElement>): Point {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: Math.floor((e.clientX - rect.left) / SCALE),
    y: Math.floor((e.clientY - rect.top) / SCALE),
  };
}

/** The tile size a resize handle points at after moving to the pointer. */
export function resizeTo(drag: ResizeDrag, e: PointerEvent<HTMLElement>): Size {
  return {
    w:
      drag.edge === "s"
        ? drag.w
        : clampSize(drag.w + Math.round((e.clientX - drag.x) / SCALE)),
    h:
      drag.edge === "e"
        ? drag.h
        : clampSize(drag.h + Math.round((e.clientY - drag.y) / SCALE)),
  };
}
