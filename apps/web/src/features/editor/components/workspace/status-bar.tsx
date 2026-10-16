"use client";

import type { ComponentProps } from "react";
import type { Point } from "../../pixel-canvas/pen";
import { ZoomControl } from "../zoom-control";

/** The bottom line: what's in use, where the pointer is, and the zoom. */
export function StatusBar({
  tool,
  layer,
  pointer,
  size,
  zoom,
}: {
  tool: string;
  layer: string;
  pointer: Point | null;
  size: { w: number; h: number };
  zoom: ComponentProps<typeof ZoomControl>;
}) {
  return (
    <footer className="flex h-9 shrink-0 items-center gap-4 border-t bg-pink-base px-4 text-xs text-muted-foreground">
      <span>{tool}</span>
      <span className="truncate">{layer}</span>
      <span
        aria-label="Pointer position in pixels"
        className="ml-auto tabular-nums"
      >
        X: {pointer?.x ?? "—"} Y: {pointer?.y ?? "—"}
      </span>
      <span className="tabular-nums">
        {size.w} × {size.h} px
      </span>
      <ZoomControl
        {...zoom}
        className="border-0 bg-transparent p-0 text-foreground shadow-none"
      />
    </footer>
  );
}
