import type { PointerEvent } from "react";
import {
  MAX_SIZE,
  MIN_SIZE,
  SCALE,
  type ResizeDrag,
  type Size,
} from "./constants";

export function clampSize(value: number) {
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, value));
}

export function sameSize(a: Size, b: Size) {
  return a.w === b.w && a.h === b.h;
}

/** Paints the pixel under the pointer, or erases it on a right-button drag. */
export function paintAt(e: PointerEvent<HTMLCanvasElement>) {
  const ctx = e.currentTarget.getContext("2d");
  if (!ctx) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / SCALE);
  const y = Math.floor((e.clientY - rect.top) / SCALE);
  if (e.buttons === 2) ctx.clearRect(x, y, 1, 1);
  else ctx.fillRect(x, y, 1, 1);
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
