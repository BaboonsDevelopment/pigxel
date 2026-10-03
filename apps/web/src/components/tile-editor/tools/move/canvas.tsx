"use client";

import { useImperativeHandle } from "react";
import { identityTransform } from "@/components/pixel-canvas/free-transform";
import { maskBounds } from "@/components/pixel-canvas/selection";
import { useSelectionMove } from "../shared/use-selection-move";
import type { ToolCanvasProps } from "../types";
import { TransformHandles } from "./transform-handles";

export function MoveCanvas({ ref, ...props }: ToolCanvasProps) {
  const { selection, sprite, scale, paused } = props;
  const { size } = sprite;
  const moving = useSelectionMove(props);

  useImperativeHandle(ref, () => ({
    down(e, point) {
      if (e.button !== 0) return;
      moving.start(e, point, !selection.mask);
    },
    move(_, passed) {
      const point = passed.at(-1);
      if (point) moving.move(point);
    },
    up: () => void moving.end(),
  }));

  const selectionBox =
    selection.mask && sprite.canPaint ? maskBounds(selection.mask, size) : null;
  const box =
    selection.freeTransform ??
    (selectionBox && {
      t: identityTransform(selectionBox),
      w: selectionBox.w,
      h: selectionBox.h,
    });
  return (
    box &&
    !paused && (
      <TransformHandles
        box={box}
        scale={scale}
        size={size}
        begin={selection.beginTransform}
        onChange={selection.setTransform}
      />
    )
  );
}
