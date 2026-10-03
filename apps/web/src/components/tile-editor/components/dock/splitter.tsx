"use client";

import type { PointerEvent } from "react";
import { cn } from "@pigxel/ui/lib/utils";

/**
 * A thin bar between two panels or stacks, dragged to share the space
 * between them. `onStart` is called on press with the bar itself (to
 * measure its neighbours) and returns what to do as the pointer moves,
 * given how far it has moved, in pixels.
 */
export function Splitter({
  axis,
  onStart,
  className,
}: {
  /** "x": a vertical bar dragged sideways; "y": a horizontal bar dragged up and down. */
  axis: "x" | "y";
  onStart: (bar: HTMLElement) => (delta: number) => void;
  className?: string;
}) {
  const start = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const bar = e.currentTarget;
    const from = axis === "x" ? e.clientX : e.clientY;
    const apply = onStart(bar);
    bar.setPointerCapture(e.pointerId);
    const move = (event: globalThis.PointerEvent) =>
      apply((axis === "x" ? event.clientX : event.clientY) - from);
    const end = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", end);
      bar.removeEventListener("pointercancel", end);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", end);
  };

  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      title="Drag to resize"
      onPointerDown={start}
      className={cn(
        "relative z-10 shrink-0 touch-none transition-colors hover:bg-primary/40 active:bg-primary/60",
        axis === "x"
          ? "-mx-0.5 w-1 cursor-col-resize"
          : "-my-0.5 h-1 cursor-row-resize",
        className,
      )}
    />
  );
}

/**
 * For a bar between two flex items sized by weight: the weights that make
 * the one before it `delta` pixels bigger (and the one after smaller), each
 * keeping at least `min` pixels.
 */
export function shareBetween(
  bar: HTMLElement,
  axis: "x" | "y",
  weights: [number, number],
  min: number,
) {
  const size = (el: Element | null) =>
    el ? el.getBoundingClientRect()[axis === "x" ? "width" : "height"] : 0;
  const a = size(bar.previousElementSibling);
  const b = size(bar.nextElementSibling);
  const total = weights[0] + weights[1];
  return (delta: number): [number, number] => {
    const next = Math.min(a + b - min, Math.max(min, a + delta));
    const first = (total * next) / Math.max(1, a + b);
    return [first, total - first];
  };
}
