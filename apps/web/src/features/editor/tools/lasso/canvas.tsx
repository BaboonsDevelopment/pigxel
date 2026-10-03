"use client";

import { useImperativeHandle, useState } from "react";
import { extendStroke, type Point } from "../../pixel-canvas/pen";
import {
  isSelected,
  polygonMask,
  selectModeOf,
  type SelectMode,
} from "../../pixel-canvas/selection";
import { PathGuide, ToolSvg } from "../shared/overlays";
import { useSelectionMove } from "../shared/use-selection-move";
import type { ToolCanvasProps } from "../types";

export function LassoCanvas({ ref, ...props }: ToolCanvasProps) {
  const { selection, sprite } = props;
  const { size } = sprite;
  const moving = useSelectionMove(props);
  const [drag, setDrag] = useState<{
    points: Point[];
    mode: SelectMode;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    down(e, point) {
      if (e.button !== 0) return;
      const mode = selectModeOf(e);
      if (mode === "replace" && isSelected(selection.mask, size, point))
        return moving.start(e, point, false);
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ points: [point], mode });
    },
    move(_, passed) {
      const point = passed.at(-1);
      if (!point || moving.move(point) || !drag) return;
      const points = passed.reduce(extendStroke, drag.points);
      if (points !== drag.points) setDrag({ ...drag, points });
    },
    up() {
      if (moving.end()) return;
      setDrag(null);
      if (!drag) return;
      if (drag.points.length < 3 && drag.mode === "replace")
        return selection.deselect();
      selection.select(polygonMask(size, drag.points), drag.mode);
    },
  }));

  return (
    drag && (
      <ToolSvg size={size}>
        <PathGuide points={drag.points} />
      </ToolSvg>
    )
  );
}
