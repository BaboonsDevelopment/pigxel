"use client";

import { useImperativeHandle } from "react";
import { clampTolerance } from "@/components/pixel-canvas/pen";
import { selectModeOf, wandMask } from "@/components/pixel-canvas/selection";
import type { ToolCanvasProps } from "../types";

export function WandCanvas({ ref, pen, sprite, selection }: ToolCanvasProps) {
  useImperativeHandle(ref, () => ({
    down(e, point) {
      if (e.button !== 0) return;
      const cel = sprite.readCel(sprite.layerId, sprite.frameId);
      selection.select(
        wandMask(
          cel,
          sprite.size,
          point,
          pen.contiguous,
          clampTolerance(pen.tolerance),
        ),
        selectModeOf(e),
      );
    },
  }));
  return null;
}
