"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  CHECKER_STYLE,
  DEFAULT_SIZE,
  GRID_STYLE,
  HANDLES,
  SCALE,
  type Edge,
  type ResizeDrag,
  type Size,
} from "./constants";
import { pixelAt, resizeTo, sameSize } from "./helpers";
import {
  brushOrigin,
  extendStroke,
  linePoints,
  strokePixels,
  type PenSettings,
  type Point,
} from "./pen";

type Stroke = {
  points: Point[];
  erase: boolean;
  /** The canvas before the stroke, so each redraw starts from it. */
  before: ImageData;
};

export function PixelCanvas({ pen }: { pen: PenSettings }) {
  const [size, setSize] = useState<Size>(DEFAULT_SIZE);
  const [pending, setPending] = useState<Size | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<Stroke>(null);
  // Where the last stroke ended; Shift+click draws a straight line from here.
  const lastPoint = useRef<Point>(null);
  const drag = useRef<ResizeDrag>(null);
  // Changing a canvas's size wipes it, so the pixels are carried over here.
  const carried = useRef<ImageData | null>(null);

  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && carried.current) ctx.putImageData(carried.current, 0, 0);
    carried.current = null;
  }, [size]);

  // Redraws the whole stroke, so pixel-perfect can take back a corner it already painted.
  const drawStroke = (ctx: CanvasRenderingContext2D, current: Stroke) => {
    ctx.putImageData(current.before, 0, 0);
    ctx.fillStyle = pen.color;
    for (const point of strokePixels(current.points, pen)) {
      const { x, y } = brushOrigin(point, pen.size);
      if (current.erase) ctx.clearRect(x, y, pen.size, pen.size);
      else ctx.fillRect(x, y, pen.size, pen.size);
    }
  };

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.button !== 2) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = pixelAt(e);
    stroke.current = {
      points:
        e.shiftKey && lastPoint.current
          ? linePoints(lastPoint.current, point)
          : [point],
      erase: e.button === 2,
      before: ctx.getImageData(0, 0, size.w, size.h),
    };
    drawStroke(ctx, stroke.current);
  };

  const moveStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pixelAt(e);
    setHover(point);
    const current = stroke.current;
    const ctx = e.currentTarget.getContext("2d");
    if (!current || !ctx) return;
    const points = extendStroke(current.points, point);
    if (points === current.points) return;
    current.points = points;
    drawStroke(ctx, current);
  };

  const endStroke = () => {
    lastPoint.current = stroke.current?.points.at(-1) ?? lastPoint.current;
    stroke.current = null;
  };

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const edge = e.currentTarget.dataset.edge as Edge;
    drag.current = { edge, x: e.clientX, y: e.clientY, ...size };
    setPending(size);
  };

  const moveResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current) setPending(resizeTo(drag.current, e));
  };

  const endResize = () => {
    drag.current = null;
    setPending(null);
    if (!pending || sameSize(pending, size)) return;
    const ctx = canvasRef.current?.getContext("2d");
    carried.current = ctx?.getImageData(0, 0, size.w, size.h) ?? null;
    setSize(pending);
  };

  return (
    <div
      className="group relative shadow-[0_0_0_1px_var(--color-border),0_18px_48px_rgba(0,0,0,0.25)]"
      style={{
        width: size.w * SCALE,
        height: size.h * SCALE,
        ...CHECKER_STYLE,
      }}
    >
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        aria-label="Tile canvas"
        className="block size-full touch-none cursor-crosshair [image-rendering:pixelated]"
        onPointerDown={startStroke}
        onPointerMove={moveStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={() => setHover(null)}
        onContextMenu={(e) => e.preventDefault()}
      />

      {hover && !pending && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute opacity-50 outline outline-1 outline-white/80"
            style={{
              left: brushOrigin(hover, pen.size).x * SCALE,
              top: brushOrigin(hover, pen.size).y * SCALE,
              width: pen.size * SCALE,
              height: pen.size * SCALE,
              backgroundColor: pen.color,
            }}
          />
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={GRID_STYLE}
      />

      {HANDLES.map(({ edge, title, className }) => (
        <div
          key={edge}
          data-edge={edge}
          title={title}
          className={`absolute touch-none opacity-40 transition-opacity group-hover:opacity-100 after:absolute after:inset-0 after:m-auto after:rounded-sm after:bg-blue-500 ${className}`}
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      ))}

      {pending && (
        <div
          className="pointer-events-none absolute top-0 left-0 border border-dashed border-blue-500 bg-blue-500/5"
          style={{ width: pending.w * SCALE, height: pending.h * SCALE }}
        >
          <span className="absolute right-0 -bottom-7 rounded bg-blue-500 px-2 py-0.5 text-xs whitespace-nowrap text-white tabular-nums">
            {pending.w} × {pending.h}
          </span>
        </div>
      )}
    </div>
  );
}
