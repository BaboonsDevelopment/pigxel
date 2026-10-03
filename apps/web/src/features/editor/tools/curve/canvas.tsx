"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  curvePoints,
  snapLine,
  strokePixels,
  type Point,
} from "@/components/pixel-canvas/pen";
import { GUIDE, ToolSvg } from "../shared/overlays";
import {
  cancelStroke,
  colorInk,
  drawStroke,
  finishStroke,
  startStroke,
  type Stroke,
} from "../shared/stroke";
import { useShapeKeys } from "../shared/use-shape-keys";
import type { ToolCanvasProps } from "../types";

type CurveStroke = Stroke & {
  bend: { c1: Point; c2: Point; stage: 0 | 1 | 2; held: boolean };
};

type Guide = { start: Point; end: Point; c1: Point; c2: Point; stage: number };

export function CurveCanvas({ ref, ...props }: ToolCanvasProps) {
  const { pen, sprite } = props;
  const stroke = useRef<CurveStroke>(null);
  const [guide, setGuide] = useState<Guide | null>(null);

  const draw = (current: CurveStroke) =>
    drawStroke(props, current, colorInk, ({ paint }) =>
      paint(
        strokePixels(
          curvePoints(
            current.points[0]!,
            current.bend.c1,
            current.bend.c2,
            current.end,
          ),
          pen,
        ),
      ),
    );

  const show = (current: CurveStroke) =>
    setGuide({
      start: current.points[0]!,
      end: current.end,
      c1: current.bend.c1,
      c2: current.bend.c2,
      stage: current.bend.stage,
    });

  const bendTo = (current: CurveStroke, point: Point) => {
    if (current.bend.stage === 1) {
      current.bend.c1 = point;
      current.bend.c2 = point;
    } else current.bend.c2 = point;
    draw(current);
    show(current);
  };

  const finish = (current: CurveStroke) => {
    stroke.current = null;
    setGuide(null);
    finishStroke(props, current, current.end);
  };

  const cancel = (current: CurveStroke) => {
    stroke.current = null;
    setGuide(null);
    cancelStroke(props, current);
  };

  useShapeKeys(guide !== null, {
    Enter: () => stroke.current && finish(stroke.current),
    Escape: () => stroke.current && cancel(stroke.current),
  });

  const keep = useEffectEvent(() => {
    if (stroke.current) finish(stroke.current);
  });
  useEffect(() => () => keep(), [sprite.layerId, sprite.frameId]);

  useImperativeHandle(ref, () => ({
    pending: () => !!stroke.current && !stroke.current.bend.held,
    down(e, point) {
      const unfinished = stroke.current;
      if (unfinished && !unfinished.bend.held) {
        e.currentTarget.setPointerCapture(e.pointerId);
        unfinished.bend.held = true;
        return bendTo(unfinished, point);
      }
      const started = startStroke(props, e, point);
      if (!started) return;
      const current: CurveStroke = {
        ...started,
        bend: { c1: point, c2: point, stage: 0, held: true },
      };
      stroke.current = current;
      draw(current);
      show(current);
    },
    move(e, passed) {
      const current = stroke.current;
      const point = passed.at(-1);
      if (!current || !point) return;
      if (current.bend.stage > 0) {
        if (current.bend.held) bendTo(current, point);
        return;
      }
      const from = current.points[0]!;
      const end = e.shiftKey ? snapLine(from, point) : point;
      if (end.x === current.end.x && end.y === current.end.y) return;
      current.end = end;
      current.bend.c1 = from;
      current.bend.c2 = end;
      show(current);
      draw(current);
    },
    up() {
      const current = stroke.current;
      if (!current) return;
      const { bend } = current;
      bend.held = false;
      const start = current.points[0]!;
      const dot = start.x === current.end.x && start.y === current.end.y;
      if (bend.stage < 2 && !(bend.stage === 0 && dot)) {
        bend.stage = bend.stage === 0 ? 1 : 2;
        return show(current);
      }
      finish(current);
    },
  }));

  return (
    guide &&
    guide.stage > 0 && (
      <ToolSvg size={sprite.size}>
        {[
          { from: guide.start, handle: guide.c1 },
          { from: guide.end, handle: guide.c2 },
        ].map(({ from, handle }, i) => (
          <g key={i}>
            <line
              x1={from.x + 0.5}
              y1={from.y + 0.5}
              x2={handle.x + 0.5}
              y2={handle.y + 0.5}
              stroke={GUIDE.stroke}
              strokeDasharray={GUIDE.strokeDasharray}
              vectorEffect={GUIDE.vectorEffect}
            />
            <circle
              cx={handle.x + 0.5}
              cy={handle.y + 0.5}
              r={0.5}
              fill="white"
              stroke={GUIDE.stroke}
              vectorEffect={GUIDE.vectorEffect}
            />
          </g>
        ))}
      </ToolSvg>
    )
  );
}
