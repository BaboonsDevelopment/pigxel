"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef } from "react";
import { extendStroke, linePoints } from "@/components/pixel-canvas/pen";
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
      draw(current);
    },
    move(_, passed) {
      const current = stroke.current;
      if (!current) return;
      const points = passed.reduce(extendStroke, current.points);
      if (points === current.points) return;
      current.points = points;
      draw(current);
    },
    up: () => finish(),
  }));
  return null;
}
