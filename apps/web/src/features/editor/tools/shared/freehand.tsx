"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef } from "react";
import {
  extendStroke,
  followRope,
  linePoints,
  type Point,
} from "../../pixel-canvas/pen";
import type { ToolCanvasProps } from "../types";
import {
  colorInk,
  drawStroke,
  finishStroke,
  startStroke,
  type Stroke,
  type StrokeInk,
  type StrokeRender,
} from "./stroke";

export function FreehandStroke({
  ref,
  render,
  ink = colorInk,
  erase,
  keepsColor,
  joinsLast,
  ...props
}: ToolCanvasProps & {
  render: StrokeRender;
  ink?: StrokeInk;
  erase?: boolean;
  keepsColor?: boolean;
  joinsLast?: boolean;
}) {
  const stroke = useRef<Stroke>(null);
  const rope = useRef<{ x: number; y: number } | null>(null);
  const draw = (current: Stroke) => drawStroke(props, current, ink, render);

  const finish = () => {
    const current = stroke.current;
    if (!current) return;
    stroke.current = null;
    finishStroke(props, current, current.points.at(-1) ?? null);
  };
  const leave = useEffectEvent(finish);
  useEffect(() => () => leave(), []);

  useImperativeHandle(ref, () => ({
    down(e, point) {
      const last = props.lastPointRef.current;
      const current = startStroke(props, e, point, {
        points:
          joinsLast && e.shiftKey && last ? linePoints(last, point) : [point],
        erase,
        keepsColor,
      });
      if (!current) return;
      stroke.current = current;
      rope.current = point;
      draw(current);
    },
    move(_, passed) {
      const current = stroke.current;
      if (!current) return;
      const length = props.pen.stabilizer;
      const followed: Point[] = [];
      if (length && rope.current)
        for (const target of passed) {
          rope.current = followRope(rope.current, target, length);
          followed.push({
            x: Math.round(rope.current.x),
            y: Math.round(rope.current.y),
          });
        }
      const points = (length ? followed : passed).reduce(
        extendStroke,
        current.points,
      );
      if (points === current.points) return;
      current.points = points;
      draw(current);
    },
    up: () => finish(),
  }));
  return null;
}
