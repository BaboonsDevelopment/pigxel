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
import {
  backgroundColor,
  type Background,
  type PigxelImage,
} from "@/lib/pigxel-file/format";
import { FrameEditor } from "./components/frame-editor";
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
import {
  areaBetween,
  isBlank,
  largestEmptyArea,
  pixelAt,
  resizeTo,
  sameSize,
  tileSnapshot,
  withoutBackground,
} from "./helpers";
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

/** Lets the page work with the canvas from outside: the AI, saving and opening files. */
export type PixelCanvasHandle = {
  size: Size;
  /** The pixels, for saving. */
  getImage: () => PigxelImage;
  /** Replaces the pixels and size, e.g. when opening a file. */
  setImage: (image: PigxelImage) => void;
  /** Paints the opaque pixels of `pixels` (`area.w × area.h` RGBA) into `area`. */
  draw: (pixels: Uint8ClampedArray, area: Area) => void;
  /** The RGBA pixels of `area`. */
  read: (area: Area) => Uint8ClampedArray;
  /** Replaces every pixel of `area`, transparent ones included. */
  write: (pixels: Uint8ClampedArray, area: Area) => void;

  clear: () => void;
  /** True when nothing but the background is drawn. */
  isEmpty: () => boolean;
  /** The biggest empty spot, or null when the tile is too full. */
  freeArea: () => Area | null;
  /** The tile (or `area`) as an enlarged PNG data URL, for the AI to look at. */
  snapshot: (area?: Area, background?: string) => string;
  /** Lets the user drag out an area; null when they cancel. */
  selectArea: () => Promise<Area | null>;
  /** Shows `area` as a frame the user can move and resize; null when they cancel. */
  adjustArea: (area: Area) => Promise<Area | null>;
};

/**
 * The tile's 2D context. Strokes, autosave and the AI read pixels back all the
 * time, so the canvas is kept in memory for fast reads. Every call asks the
 * same way, since the first one decides.
 */
function tileContext(canvas: HTMLCanvasElement | null) {
  return canvas?.getContext("2d", { willReadFrequently: true }) ?? null;
}

/** The RGB of a solid background, used to treat it as empty space. */
const BACKGROUND_RGB: Record<Background, [number, number, number] | null> = {
  transparent: null,
  white: [255, 255, 255],
  black: [0, 0, 0],
};

export function PixelCanvas({
  pen,
  scale,
  highlight,
  background = "transparent",
  initialImage,
  onChange,
  ref,
}: {
  pen: PenSettings;
  /** Screen pixels per tile pixel. */
  scale: number;
  /** An area to point out, e.g. where a picture would go. */
  highlight?: Area | null;
  /** What the eraser paints and what fills new space when the tile grows. */
  background?: Background;
  /** Pixels to start from, such as a restored draft. */
  initialImage?: PigxelImage | null;
  /** Called after the drawing or the tile size changes. */
  onChange?: () => void;
  ref?: Ref<PixelCanvasHandle>;
}) {
  const [initial] = useState(() =>
    initialImage
      ? new ImageData(
          new Uint8ClampedArray(initialImage.data),
          initialImage.width,
          initialImage.height,
        )
      : null,
  );
  const [size, setSize] = useState<Size>(() =>
    initial ? { w: initial.width, h: initial.height } : DEFAULT_SIZE,
  );
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
  const carried = useRef<ImageData | null>(initial);
  const fill = backgroundColor(background);
  const selectFrom = useRef<Point>(null);
  const resolveSelection = useRef<(area: Area | null) => void>(null);
  const [frame, setFrame] = useState<Area | null>(null);
  const resolveFrame = useRef<(area: Area | null) => void>(null);

  const finishSelection = useCallback((area: Area | null) => {
    resolveSelection.current?.(area);
    resolveSelection.current = null;
    selectFrom.current = null;
    setSelection(null);
    setSelecting(false);
  }, []);

  const finishFrame = useCallback((area: Area | null) => {
    resolveFrame.current?.(area);
    resolveFrame.current = null;
    setFrame(null);
  }, []);

  useImperativeHandle(ref, () => {
    const context = () => tileContext(canvasRef.current) ?? null;
    const read = () => context()?.getImageData(0, 0, size.w, size.h) ?? null;
    // Pixels of a solid background count as empty space for the AI.
    const content = () => {
      const image = read();
      return image && withoutBackground(image, BACKGROUND_RGB[background]);
    };
    return {
      size,
      getImage() {
        const data = read()?.data ?? new Uint8ClampedArray(size.w * size.h * 4);
        return { width: size.w, height: size.h, data, background };
      },
      setImage({ width, height, data }) {
        // Applied by the layout effect once the canvas has its new size.
        carried.current = new ImageData(
          new Uint8ClampedArray(data),
          width,
          height,
        );
        lastPoint.current = null;
        setSize({ w: width, h: height });
      },
      draw(pixels, area) {
        const ctx = context();
        if (!ctx) return;
        // Keep what is under the picture's transparent pixels.
        const target = ctx.getImageData(area.x, area.y, area.w, area.h);
        for (let i = 0; i < target.data.length; i += 4) {
          if (pixels[i + 3]) target.data.set(pixels.subarray(i, i + 4), i);
        }
        ctx.putImageData(target, area.x, area.y);
        onChange?.();
      },
      read(area) {
        const image = context()?.getImageData(area.x, area.y, area.w, area.h);
        return image?.data ?? new Uint8ClampedArray(area.w * area.h * 4);
      },
      write(pixels, area) {
        context()?.putImageData(
          new ImageData(new Uint8ClampedArray(pixels), area.w, area.h),
          area.x,
          area.y,
        );
      },
      clear() {
        const ctx = context();
        if (!ctx) return;
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillRect(0, 0, size.w, size.h);
        } else ctx.clearRect(0, 0, size.w, size.h);
        onChange?.();
      },
      isEmpty() {
        const image = content();
        return !image || isBlank(image);
      },
      freeArea() {
        const image = content();
        return image && largestEmptyArea(image);
      },
      snapshot(area, background) {
        const canvas = canvasRef.current;
        return canvas ? tileSnapshot(canvas, area, background) : "";
      },
      selectArea() {
        resolveSelection.current?.(null);
        setSelecting(true);
        return new Promise<Area | null>((resolve) => {
          resolveSelection.current = resolve;
        });
      },
      adjustArea(area) {
        resolveFrame.current?.(null);
        setFrame(area);
        return new Promise<Area | null>((resolve) => {
          resolveFrame.current = resolve;
        });
      },
    };
  }, [size, background, fill, onChange]);

  useEffect(() => {
    if (!selecting) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") finishSelection(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selecting, finishSelection]);

  useEffect(() => {
    if (!frame) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") finishFrame(null);
      if (e.key === "Enter") finishFrame(frame);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [frame, finishFrame]);

  useLayoutEffect(() => {
    const ctx = tileContext(canvasRef.current);
    if (ctx && carried.current) {
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, size.w, size.h);
      }
      ctx.putImageData(carried.current, 0, 0);
    }
    carried.current = null;
  }, [size, fill]);

  // Redraws the whole stroke, so pixel-perfect can take back a corner it already painted.
  const drawStroke = (ctx: CanvasRenderingContext2D, current: Stroke) => {
    ctx.putImageData(current.before, 0, 0);
    ctx.fillStyle = current.erase && fill ? fill : pen.color;
    for (const point of strokePixels(current.points, pen)) {
      const { x, y } = brushOrigin(point, pen.size);
      // Erasing reveals the background: transparent, or its solid colour.
      if (current.erase && !fill) ctx.clearRect(x, y, pen.size, pen.size);
      else ctx.fillRect(x, y, pen.size, pen.size);
    }
  };

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // While a frame is being placed, clicks on the tile must not paint.
    if (frame || (e.button !== 0 && e.button !== 2)) return;
    const ctx = tileContext(e.currentTarget);
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
    const ctx = tileContext(e.currentTarget);
    if (!current || !ctx) return;
    const points = extendStroke(current.points, point);
    if (points === current.points) return;
    current.points = points;
    drawStroke(ctx, current);
  };

  const endStroke = () => {
    if (!stroke.current) return;
    lastPoint.current = stroke.current.points.at(-1) ?? lastPoint.current;
    stroke.current = null;
    onChange?.();
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
    const ctx = tileContext(canvasRef.current);
    carried.current = ctx?.getImageData(0, 0, size.w, size.h) ?? null;
    setSize(pending);
    onChange?.();
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

        {hover && !pending && !selecting && !frame && (
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

        {highlight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute animate-pulse border-2 border-amber-400 bg-amber-400/25"
            style={{
              left: highlight.x * scale,
              top: highlight.y * scale,
              width: highlight.w * scale,
              height: highlight.h * scale,
            }}
          />
        )}

        {frame && (
          <FrameEditor
            frame={frame}
            tile={size}
            scale={scale}
            onChange={setFrame}
            onConfirm={() => finishFrame(frame)}
            onCancel={() => finishFrame(null)}
          />
        )}

        {!selecting &&
          !frame &&
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
