"use client";

import type { PointerEvent } from "react";
import { cn } from "@pigxel/ui/lib/utils";

export function Splitter({
  axis,
  onStart,
  className,
}: {
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
