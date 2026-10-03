"use client";

import { useImperativeHandle } from "react";
import { slotOf } from "../shared/stroke";
import type { ToolCanvasProps } from "../types";

export function PipetteCanvas({ ref, pickColor }: ToolCanvasProps) {
  useImperativeHandle(ref, () => ({
    down: (e, point) => pickColor(point, slotOf(e)),
  }));
  return null;
}
