"use client";

import { useImperativeHandle, useState } from "react";
import type { Point } from "../../pixel-canvas/pen";
import {
  isSelected,
  polygonMask,
  selectModeOf,
  type SelectMode,
} from "../../pixel-canvas/selection";
import { Corners, PathGuide, ToolSvg } from "../shared/overlays";
import { useSelectionMove } from "../shared/use-selection-move";
import { useShapeKeys } from "../shared/use-shape-keys";
import type { ToolCanvasProps } from "../types";

type Polygon = { points: Point[]; pointer: Point; mode: SelectMode };

export function PolygonLassoCanvas({ ref, ...props }: ToolCanvasProps) {
  const { selection, sprite } = props;
  const { size } = sprite;
  const moving = useSelectionMove(props);
  const [polygon, setPolygon] = useState<Polygon | null>(null);

  const close = (current: Polygon) => {
    setPolygon(null);
    if (current.points.length >= 3)
      selection.select(polygonMask(size, current.points), current.mode);
  };

  const addCorner = (current: Polygon, p: Point) => {
    const [first] = current.points;
    const last = current.points.at(-1)!;
    if (current.points.length >= 3 && p.x === first!.x && p.y === first!.y)
      return close(current);
    if (p.x !== last.x || p.y !== last.y)
      setPolygon({ ...current, points: [...current.points, p] });
  };

  useShapeKeys(polygon !== null, {
    Enter: () => polygon && close(polygon),
    Escape: () => setPolygon(null),
  });

  useImperativeHandle(ref, () => ({
    pending: () => polygon !== null,
    down(e, point) {
      if (e.button !== 0) return;
      if (polygon) return addCorner(polygon, point);
      const mode = selectModeOf(e);
      if (mode === "replace" && isSelected(selection.mask, size, point))
        return moving.start(e, point, false);
      setPolygon({ points: [point], pointer: point, mode });
    },
    move(_, passed) {
      const point = passed.at(-1);
      if (!point || moving.move(point) || !polygon) return;
      if (point.x !== polygon.pointer.x || point.y !== polygon.pointer.y)
        setPolygon({ ...polygon, pointer: point });
    },
    up: () => void moving.end(),
    doubleClick: () => polygon && close(polygon),
  }));

  return (
    polygon && (
      <ToolSvg size={size}>
        <PathGuide points={[...polygon.points, polygon.pointer]} />
        <Corners points={polygon.points} pointer={polygon.pointer} />
      </ToolSvg>
    )
  );
}
