"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { sprayDotCount, sprayDots } from "@/components/pixel-canvas/pen";
import {
  drawStroke,
  finishStroke,
  penInk,
  startStroke,
  type Stroke,
  type StrokeRender,
} from "../shared/stroke";
import type { ToolCanvasProps } from "../types";

const render: StrokeRender = ({ stroke, paint }) => paint(stroke.points, true);

export function SprayCanvas({ ref, ...props }: ToolCanvasProps) {
  const { pen } = props;
  const stroke = useRef<Stroke>(null);
  const [spraying, setSpraying] = useState(false);

  const tick = useEffectEvent((seconds: number) => {
    const current = stroke.current;
    if (!current) return;
    const count = sprayDotCount(pen.spraySpeed, seconds);
    const dots = Math.floor(count) + (Math.random() < count % 1 ? 1 : 0);
    if (!dots) return;
    current.points.push(...sprayDots(current.end, pen.sprayWidth, dots));
    drawStroke(props, current, penInk, render);
  });
  useEffect(() => {
    if (!spraying) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      tick((now - last) / 1000);
      last = now;
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [spraying]);

  const finish = () => {
    const current = stroke.current;
    if (!current) return;
    stroke.current = null;
    setSpraying(false);
    finishStroke(props, current, current.points.at(-1) ?? null);
  };
  const leave = useEffectEvent(finish);
  useEffect(() => () => leave(), []);

  useImperativeHandle(ref, () => ({
    down(e, point) {
      const current = startStroke(props, e, point, {
        points: sprayDots(point, pen.sprayWidth, 1),
        keepsColor: pen.ink !== "shading",
      });
      if (!current) return;
      stroke.current = current;
      drawStroke(props, current, penInk, render);
      setSpraying(true);
    },
    move(_, passed) {
      const current = stroke.current;
      const point = passed.at(-1);
      if (current && point) current.end = point;
    },
    up: () => finish(),
  }));
  return null;
}
