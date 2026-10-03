"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { snapLine, type Point } from "../../pixel-canvas/pen";
import { Corners, ToolSvg } from "../shared/overlays";
import {
  cancelStroke,
  drawStroke,
  finishStroke,
  penInk,
  polygonPixels,
  startStroke,
  type Stroke,
} from "../shared/stroke";
import { useShapeKeys } from "../shared/use-shape-keys";
import type { ToolCanvasProps } from "../types";

export function PolygonCanvas({ ref, ...props }: ToolCanvasProps) {
  const { pen, sprite } = props;
  const stroke = useRef<Stroke>(null);
  const [corners, setCorners] = useState<{
    points: Point[];
    pointer: Point;
  } | null>(null);

  const draw = (current: Stroke) =>
    drawStroke(props, current, penInk, ({ paint }) =>
      paint(polygonPixels(sprite.size, [...current.points, current.end]), true),
    );

  const show = (current: Stroke) =>
    setCorners({ points: [...current.points], pointer: current.end });

  const cancel = (current: Stroke) => {
    stroke.current = null;
    setCorners(null);
    cancelStroke(props, current);
  };

  const close = (current: Stroke) => {
    if (current.points.length < 3) return cancel(current);
    current.end = current.points.at(-1)!;
    draw(current);
    stroke.current = null;
    setCorners(null);
    finishStroke(props, current, current.points.at(-1) ?? null);
  };

  const addCorner = (current: Stroke, point: Point) => {
    const first = current.points[0]!;
    const last = current.points.at(-1)!;
    if (
      current.points.length >= 3 &&
      point.x === first.x &&
      point.y === first.y
    )
      return close(current);
    if (point.x === last.x && point.y === last.y) return;
    current.points.push(point);
    current.end = point;
    draw(current);
    show(current);
  };

  useShapeKeys(corners !== null, {
    Enter: () => stroke.current && close(stroke.current),
    Escape: () => stroke.current && cancel(stroke.current),
  });

  const keep = useEffectEvent(() => {
    if (stroke.current) close(stroke.current);
  });
  useEffect(() => () => keep(), [sprite.layerId, sprite.frameId]);

  useImperativeHandle(ref, () => ({
    pending: () => stroke.current !== null,
    down(e, point) {
      const unfinished = stroke.current;
      if (unfinished) {
        const last = unfinished.points.at(-1)!;
        return addCorner(
          unfinished,
          e.shiftKey ? snapLine(last, point) : point,
        );
      }
      const current = startStroke(props, e, point, {
        keepsColor: pen.ink !== "shading",
      });
      if (!current) return;
      stroke.current = current;
      draw(current);
      show(current);
    },
    move(e, passed) {
      const current = stroke.current;
      const point = passed.at(-1);
      if (!current || !point) return;
      const last = current.points.at(-1)!;
      const end = e.shiftKey ? snapLine(last, point) : point;
      if (end.x === current.end.x && end.y === current.end.y) return;
      current.end = end;
      draw(current);
      show(current);
    },
    doubleClick: () => stroke.current && close(stroke.current),
  }));

  return (
    corners && (
      <ToolSvg size={sprite.size}>
        <Corners points={corners.points} pointer={corners.pointer} />
      </ToolSvg>
    )
  );
}
