"use client";

import { useImperativeHandle, useState } from "react";
import { areaBetween, boxBetween } from "../../pixel-canvas/helpers";
import { snapSpan, squareFrom, type Point } from "../../pixel-canvas/pen";
import {
  ellipseMask,
  isSelected,
  roundedRectMask,
  selectModeOf,
  type SelectMode,
} from "../../pixel-canvas/selection";
import type { ToolCanvasProps } from "../types";
import { GUIDE, SizeLabel, ToolSvg } from "./overlays";
import { useSelectionMove } from "./use-selection-move";

type Drag = {
  origin: Point;
  from: Point;
  to: Point;
  mode: SelectMode;
  moved?: boolean;
};

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
      const { from, to } = snapSpan(point, point, props.snap);
      setDrag({ origin: point, from, to, mode });
    },
    move(e, passed) {
      const point = passed.at(-1);
      if (!point || moving.move(point) || !drag) return;
      const span = snapSpan(drag.origin, point, props.snap);
      const to = ellipse ? squareFrom(span.from, span.to, e.shiftKey) : span.to;
      if (
        to.x !== drag.to.x ||
        to.y !== drag.to.y ||
        span.from.x !== drag.from.x ||
        span.from.y !== drag.from.y
      )
        setDrag({ ...drag, from: span.from, to, moved: true });
    },
    up() {
      if (moving.end()) return;
      setDrag(null);
      if (!drag) return;
      const { from, to, mode, moved } = drag;
      const clicked = props.snap ? !moved : from.x === to.x && from.y === to.y;
      if (clicked && mode === "replace") return selection.deselect();
      selection.select(
        ellipse
          ? ellipseMask(size, boxBetween(from, to))
          : roundedRectMask(
              size,
              areaBetween(from, to, size),
              props.pen.cornerRadius,
            ),
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
          <rect
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            rx={Math.min(props.pen.cornerRadius, box.w / 2, box.h / 2)}
            {...GUIDE}
          />
        )}
      </ToolSvg>
      <SizeLabel box={box} scale={scale} />
    </>
  );
}
