"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
import { SelectionOverlay } from "./components/selection-overlay";
import {
  CHECKER_STYLE,
  DEFAULT_SIZE,
  GRID_STYLE,
  HANDLES,
  type Area,
  type Edge,
  type ResizeDrag,
  type Size,
} from "./constants";
import { areaBetween, pixelAt, resizeTo, sameSize } from "./helpers";
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

/** Lets the page work with the canvas from outside, e.g. from the AI. */
export type PixelCanvasHandle = {
  size: Size;
  /** Replaces the pixels of `area` with `pixels` (`area.w × area.h` RGBA). */
  draw: (pixels: Uint8ClampedArray, area: Area) => void;
  /** Lets the user drag out an area; null when they cancel. */
  selectArea: () => Promise<Area | null>;
};

export function PixelCanvas({
  pen,
  scale,
  ref,
}: {
  pen: PenSettings;
  /** Screen pixels per tile pixel. */
  scale: number;
  ref?: Ref<PixelCanvasHandle>;
}) {
  const [size, setSize] = useState<Size>(DEFAULT_SIZE);
  const [pending, setPending] = useState<Size | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<Area | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<Stroke>(null);
  // Where the last stroke ended; Shift+click draws a straight line from here.
  const lastPoint = useRef<Point>(null);
  const drag = useRef<ResizeDrag>(null);
  // Changing a canvas's size wipes it, so the pixels are carried over here.
  const carried = useRef<ImageData | null>(null);
  const selectFrom = useRef<Point>(null);
  const resolveSelection = useRef<(area: Area | null) => void>(null);

  const finishSelection = useCallback((area: Area | null) => {
    resolveSelection.current?.(area);
    resolveSelection.current = null;
    selectFrom.current = null;
    setSelection(null);
    setSelecting(false);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      size,
      draw(pixels, area) {
        const ctx = canvasRef.current?.getContext("2d");
        ctx?.putImageData(
          new ImageData(new Uint8ClampedArray(pixels), area.w, area.h),
          area.x,
          area.y,
        );
      },
      selectArea() {
        resolveSelection.current?.(null);
        setSelecting(true);
        return new Promise((resolve) => {
          resolveSelection.current = resolve;
        });
      },
    }),
    [size],
  );

  useEffect(() => {
    if (!selecting) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") finishSelection(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selecting, finishSelection]);

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

  const startSelect = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    selectFrom.current = pixelAt(e);
    setSelection(areaBetween(selectFrom.current, selectFrom.current, size));
  };

  const moveSelect = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (selectFrom.current) {
      setSelection(areaBetween(selectFrom.current, pixelAt(e), size));
    }
  };

  const endSelect = () => {
    if (selectFrom.current) finishSelection(selection);
  };

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const edge = e.currentTarget.dataset.edge as Edge;
    drag.current = { edge, x: e.clientX, y: e.clientY, ...size };
    setPending(size);
  };

  const moveResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current) setPending(resizeTo(drag.current, e, scale));
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
    <>
      {selecting && <SelectionOverlay onCancel={() => finishSelection(null)} />}

      <div
        className={`group relative shadow-[0_0_0_1px_var(--color-border),0_18px_48px_rgba(0,0,0,0.25)] ${selecting ? "z-50" : ""}`}
        style={{
          width: size.w * scale,
          height: size.h * scale,
          ...CHECKER_STYLE,
        }}
      >
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          aria-label="Tile canvas"
          className="block size-full touch-none cursor-crosshair [image-rendering:pixelated]"
          onPointerDown={selecting ? startSelect : startStroke}
          onPointerMove={selecting ? moveSelect : moveStroke}
          onPointerUp={selecting ? endSelect : endStroke}
          onPointerCancel={selecting ? endSelect : endStroke}
          onPointerLeave={() => setHover(null)}
          onContextMenu={(e) => e.preventDefault()}
        />

        {hover && !pending && !selecting && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div
              className="absolute opacity-50 outline outline-1 outline-white/80"
              style={{
                left: brushOrigin(hover, pen.size).x * scale,
                top: brushOrigin(hover, pen.size).y * scale,
                width: pen.size * scale,
                height: pen.size * scale,
                backgroundColor: pen.color,
              }}
            />
          </div>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ ...GRID_STYLE, backgroundSize: `${scale}px ${scale}px` }}
        />

        {selection && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-blue-500 bg-blue-500/15"
            style={{
              left: selection.x * scale,
              top: selection.y * scale,
              width: selection.w * scale,
              height: selection.h * scale,
            }}
          >
            <span className="absolute right-0 -bottom-7 rounded bg-blue-500 px-2 py-0.5 text-xs whitespace-nowrap text-white tabular-nums">
              {selection.w} × {selection.h}
            </span>
          </div>
        )}

        {!selecting &&
          HANDLES.map(({ edge, title, className }) => (
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
            style={{ width: pending.w * scale, height: pending.h * scale }}
          >
            <span className="absolute right-0 -bottom-7 rounded bg-blue-500 px-2 py-0.5 text-xs whitespace-nowrap text-white tabular-nums">
              {pending.w} × {pending.h}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
