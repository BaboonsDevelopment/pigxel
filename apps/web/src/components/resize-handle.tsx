"use client";

import type { PointerEvent } from "react";

type Props = {
  /** The panel edge the handle sits on; dragging away from the panel grows it. */
  edge: "left" | "right" | "top";
  size: number;
  min: number;
  max: number;
  onResize: (size: number) => void;
};

/** A panel's inner edge, dragged to change its width or height. */
export function ResizeHandle({ edge, size, min, max, onResize }: Props) {
  const axis = edge === "top" ? "clientY" : "clientX";
  // Dragging away from the panel grows it: leftwards for a left edge.
  const sign = edge === "right" ? -1 : 1;

  const start = (e: PointerEvent<HTMLDivElement>) => {
    const handle = e.currentTarget;
    const from = { at: e[axis], size };
    handle.setPointerCapture(e.pointerId);
    const move = (event: globalThis.PointerEvent) =>
      onResize(
        Math.min(
          max,
          Math.max(min, from.size + sign * (from.at - event[axis])),
        ),
      );
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };

  return (
    <div
      role="separator"
      aria-orientation={edge === "top" ? "horizontal" : "vertical"}
      aria-valuenow={size}
      aria-valuemin={min}
      aria-valuemax={max}
      title="Drag to resize"
      onPointerDown={start}
      className={`absolute z-10 touch-none hover:bg-primary/20 ${
        edge === "left"
          ? "inset-y-0 -left-1 w-2 cursor-col-resize"
          : edge === "right"
            ? "inset-y-0 -right-1 w-2 cursor-col-resize"
            : "inset-x-0 -top-1 h-2 cursor-row-resize"
      }`}
    />
  );
}
