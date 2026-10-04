"use client";

import { useImperativeHandle } from "react";
import {
  inPattern,
  mirrored,
  patternColor,
  wrapPixel,
  type Rgba,
} from "../../pixel-canvas/paint";
import { clampTolerance, fillPoints, type Point } from "../../pixel-canvas/pen";
import { isSelected } from "../../pixel-canvas/selection";
import { inkColor, slotOf } from "../shared/stroke";
import type { ToolCanvasProps, ToolContext } from "../types";

function fillAt(
  { pen, sprite, stamp, paintOptions, onUseColor }: ToolContext,
  ctx: CanvasRenderingContext2D,
  point: Point,
  rgba: Rgba,
  color: string | null,
) {
  const { size, symmetry, tiled, mask } = paintOptions;
  const image = ctx.getImageData(0, 0, size.w, size.h);
  const allLayers = pen.fillFrom === "all";
  const bounds = allLayers
    ? new ImageData(
        sprite.composite(["reference"]) as Uint8ClampedArray<ArrayBuffer>,
        size.w,
        size.h,
      )
    : image;
  const texture = pen.stampPattern ? stamp : null;
  let changed = false;
  for (const copy of mirrored(point, size, symmetry)) {
    const at = wrapPixel(copy.x, copy.y, size, tiled);
    if (!at || (mask && !isSelected(mask, size, at))) continue;
    const start = (at.y * size.w + at.x) * 4;
    if (
      !texture &&
      !allLayers &&
      rgba.every((v, c) => image.data[start + c] === v)
    )
      continue;
    for (const i of fillPoints(
      bounds,
      at,
      pen.contiguous,
      clampTolerance(pen.tolerance),
    )) {
      if (mask && !mask[i]) continue;
      if (!inPattern(i % size.w, Math.floor(i / size.w), pen.density)) continue;
      const fill = texture
        ? patternColor(texture, i % size.w, Math.floor(i / size.w))
        : rgba;
      if (fill.some((v, c) => image.data[i * 4 + c] !== v)) changed = true;
      image.data.set(fill, i * 4);
    }
  }
  if (!changed) return;
  ctx.putImageData(image, 0, 0);
  sprite.commit();
  if (color && !texture) onUseColor?.(color);
}

export function BucketCanvas({ ref, ...props }: ToolCanvasProps) {
  useImperativeHandle(ref, () => ({
    down(e, point) {
      props.selection.drop();
      const ctx = props.sprite.context(true);
      if (!ctx) return;
      const { color, rgba } = inkColor(props, slotOf(e));
      fillAt(props, ctx, point, rgba, color);
    },
  }));
  return null;
}
