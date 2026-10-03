"use client";

import { useImperativeHandle, useState } from "react";
import { areaBetween, boxBetween } from "../../pixel-canvas/helpers";
import { squareFrom, type Point } from "../../pixel-canvas/pen";
import {
  ellipseMask,
  isSelected,
  rectMask,
  selectModeOf,
  type SelectMode,
} from "../../pixel-canvas/selection";
import type { ToolCanvasProps } from "../types";
import { GUIDE, SizeLabel, ToolSvg } from "./overlays";
import { useSelectionMove } from "./use-selection-move";

type Drag = { from: Point; to: Point; mode: SelectMode };

export function MarqueeSelect({
  ref,
  ellipse = false,
  ...props
}: ToolCanvasProps & { ellipse?: boolean }) {
  const { selection, sprite, scale } = props;
  const { size } = sprite;
  const moving = useSelectionMove(props);
  const [drag, setDrag] = useState<Drag | null>(null);

  useImperativeHandle(ref, () => ({
    down(e, point) {
      if (e.button !== 0) return;
      const mode = selectModeOf(e);
      if (mode === "replace" && isSelected(selection.mask, size, point))
        return moving.start(e, point, false);
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ from: point, to: point, mode });
    },
    move(e, passed) {
      const point = passed.at(-1);
      if (!point || moving.move(point) || !drag) return;
      const to = ellipse ? squareFrom(drag.from, point, e.shiftKey) : point;
      if (to.x !== drag.to.x || to.y !== drag.to.y) setDrag({ ...drag, to });
    },
    up() {
      if (moving.end()) return;
      setDrag(null);
      if (!drag) return;
      const { from, to, mode } = drag;
      if (from.x === to.x && from.y === to.y && mode === "replace")
        return selection.deselect();
      selection.select(
        ellipse
          ? ellipseMask(size, boxBetween(from, to))
          : rectMask(size, areaBetween(from, to, size)),
        mode,
      );
    },
  }));

  if (!drag) return null;
  const box = ellipse
    ? boxBetween(drag.from, drag.to)
    : areaBetween(drag.from, drag.to, size);
  return (
    <>
      <ToolSvg size={size}>
        {ellipse ? (
          <ellipse
            cx={box.x + box.w / 2}
            cy={box.y + box.h / 2}
            rx={box.w / 2}
            ry={box.h / 2}
            {...GUIDE}
          />
        ) : (
          <rect x={box.x} y={box.y} width={box.w} height={box.h} {...GUIDE} />
        )}
      </ToolSvg>
      <SizeLabel box={box} scale={scale} />
    </>
  );
}
