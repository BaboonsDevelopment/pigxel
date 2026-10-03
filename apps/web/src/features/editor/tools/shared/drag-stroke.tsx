"use client";

import { useEffect, useEffectEvent, useImperativeHandle, useRef } from "react";
import { snapLine, squareFrom } from "../../pixel-canvas/pen";
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

export function DragStroke({
  ref,
  render,
  ink = colorInk,
  keepsColor,
  square,
  continuesFromEnd,
  ...props
}: ToolCanvasProps & {
  render: StrokeRender;
  ink?: StrokeInk;
  keepsColor?: boolean;
  square?: boolean;
  continuesFromEnd?: boolean;
}) {
  const stroke = useRef<Stroke>(null);
  const draw = (current: Stroke) => drawStroke(props, current, ink, render);

  const finish = () => {
    const current = stroke.current;
    if (!current) return;
    stroke.current = null;
    finishStroke(
      props,
      current,
      continuesFromEnd ? current.end : (current.points.at(-1) ?? null),
    );
  };
  const leave = useEffectEvent(finish);
  useEffect(() => () => leave(), []);

  useImperativeHandle(ref, () => ({
    down(e, point) {
      const current = startStroke(props, e, point, { keepsColor });
      if (!current) return;
      stroke.current = current;
      draw(current);
    },
    move(e, passed) {
      const current = stroke.current;
      const point = passed.at(-1);
      if (!current || !point) return;
      const from = current.points[0]!;
      const end = square
        ? squareFrom(from, point, e.shiftKey)
        : e.shiftKey
          ? snapLine(from, point)
          : point;
      if (end.x === current.end.x && end.y === current.end.y) return;
      current.end = end;
      draw(current);
    },
    up: () => finish(),
  }));
  return null;
}
