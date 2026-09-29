"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
import { hexToRgba } from "@/lib/edit/raster";
import { backgroundColor } from "@/lib/pigxel-file/format";
import { FrameEditor } from "./components/frame-editor";
import { SelectionOverlay } from "./components/selection-overlay";
import {
  CHECKER_STYLE,
  GRID_STYLE,
  HANDLES,
  type Area,
  type Edge,
  type ResizeDrag,
  type Size,
} from "./constants";
import {
  areaBetween,
  canvasOf,
  isBlank,
  largestEmptyArea,
  pixelAt,
  resizeTo,
  sameSize,
  tileSnapshot,
} from "./helpers";
import {
  brushOrigin,
  brushTip,
  extendStroke,
  fillPoints,
  linePoints,
  pixelColor,
  snapLine,
  strokePixels,
  type PaintTool,
  type PenSettings,
  type Point,
} from "./pen";
import type { SpriteApi } from "./use-sprite";

type Stroke = {
  /** The tool that started the stroke: pen, brush, eraser or line. */
  tool: PaintTool;
  /** Pixels the tip passes through; a line keeps its start as the first one. */
  points: Point[];
  erase: boolean;
  /** The layer before the stroke, so each redraw starts from it. */
  before: ImageData;
};

/**
 * Lets the page work with the canvas from outside, e.g. the AI. Pixel reads
 * and writes go to the active cel (the active layer in the active frame); the
 * checks for empty space and the snapshots look at the whole frame.
 */
export type PixelCanvasHandle = {
  size: Size;
  /** Paints the opaque pixels of `pixels` (`area.w × area.h` RGBA) into `area`. */
  draw: (pixels: Uint8ClampedArray, area: Area) => void;
  /** The RGBA pixels of `area`. */
  read: (area: Area) => Uint8ClampedArray;
  /** Replaces every pixel of `area`, transparent ones included. */
  write: (pixels: Uint8ClampedArray, area: Area) => void;
  /** Empties the active layer (a Background goes back to its colour). */
  clear: () => void;
  /** The RGBA of `area` on the whole tile, every layer combined. */
  readTile: (area: Area) => Uint8ClampedArray;
  /** True when nothing is drawn on any layer but the Background. */
  isEmpty: () => boolean;
  /** The biggest empty spot on the tile, or null when it is too full. */
  freeArea: () => Area | null;
  /** The tile (or `area` of it) as an enlarged PNG data URL, for the AI. */
  snapshot: (area?: Area, background?: string) => string;
  /** The same for the active layer alone, e.g. for a redraw of it. */
  snapshotLayer: (area: Area, background: string) => string;
  /** Lets the user drag out an area; null when they cancel. */
  selectArea: () => Promise<Area | null>;
  /** Shows `area` as a frame the user can move and resize; null when they cancel. */
  adjustArea: (area: Area) => Promise<Area | null>;
};

export function PixelCanvas({
  tool,
  pen,
  scale,
  sprite,
  highlight,
  onPickColor,
  ref,
}: {
  tool: PaintTool;
  pen: PenSettings;
  /** Screen pixels per tile pixel. */
  scale: number;
  sprite: SpriteApi;
  /** An area to point out, e.g. where a picture would go. */
  highlight?: Area | null;
  /** Called with the colour the pipette (or Alt+click) picked up. */
  onPickColor?: (color: string) => void;
  ref?: Ref<PixelCanvasHandle>;
}) {
  const { size } = sprite;
  const [pending, setPending] = useState<Size | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<Area | null>(null);
  const screenRef = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<Stroke>(null);
  // Where the last stroke ended; Shift+click draws a straight line from here.
  const lastPoint = useRef<Point>(null);
  const drag = useRef<ResizeDrag>(null);
  const selectFrom = useRef<Point>(null);
  const resolveSelection = useRef<(area: Area | null) => void>(null);
  const [frame, setFrame] = useState<Area | null>(null);
  const resolveFrame = useRef<(area: Area | null) => void>(null);
  // Erasing the Background paints its colour; other layers become transparent.
  const eraseFill =
    sprite.activeLayer?.kind === "background"
      ? backgroundColor(sprite.background)
      : null;

  // The screen shows the active frame, every layer combined, references
  // included. It repaints when a cel, a layer or the frame changes, not on
  // every render.
  const paintScreen = useEffectEvent(() => {
    screenRef.current
      ?.getContext("2d")
      ?.putImageData(
        new ImageData(
          sprite.composite() as Uint8ClampedArray<ArrayBuffer>,
          size.w,
          size.h,
        ),
        0,
        0,
      );
  });
  useLayoutEffect(
    () => paintScreen(),
    [sprite.version, sprite.tree, sprite.frameId, size],
  );

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
    // Reads leave an empty cel alone; writes make it first.
    const ctx = (create = false) => sprite.context(create);
    // The tile as the AI sees it: no references, no Background.
    const content = () =>
      new ImageData(
        sprite.composite([
          "reference",
          "background",
        ]) as Uint8ClampedArray<ArrayBuffer>,
        size.w,
        size.h,
      );
    const tile = () => canvasOf(sprite.composite(["reference"]), size);
    return {
      size,
      draw(pixels, area) {
        const c = ctx(true);
        if (!c) return;
        // Keep what is under the picture's transparent pixels.
        const target = c.getImageData(area.x, area.y, area.w, area.h);
        for (let i = 0; i < target.data.length; i += 4) {
          if (pixels[i + 3]) target.data.set(pixels.subarray(i, i + 4), i);
        }
        c.putImageData(target, area.x, area.y);
        sprite.commit();
      },
      read(area) {
        const image = ctx()?.getImageData(area.x, area.y, area.w, area.h);
        return image?.data ?? new Uint8ClampedArray(area.w * area.h * 4);
      },
      write(pixels, area) {
        ctx(true)?.putImageData(
          new ImageData(new Uint8ClampedArray(pixels), area.w, area.h),
          area.x,
          area.y,
        );
        sprite.commit();
      },
      clear() {
        const c = ctx(true);
        if (!c) return;
        if (eraseFill) {
          c.fillStyle = eraseFill;
          c.fillRect(0, 0, size.w, size.h);
        } else c.clearRect(0, 0, size.w, size.h);
        sprite.commit();
      },
      readTile(area) {
        const image = tile()
          .getContext("2d", { willReadFrequently: true })
          ?.getImageData(area.x, area.y, area.w, area.h);
        return image?.data ?? new Uint8ClampedArray(area.w * area.h * 4);
      },
      isEmpty: () => isBlank(content()),
      freeArea: () => largestEmptyArea(content()),
      snapshot: (area, background) => tileSnapshot(tile(), area, background),
      snapshotLayer(area, background) {
        const pixels =
          ctx()?.getImageData(0, 0, size.w, size.h).data ??
          new Uint8ClampedArray(size.w * size.h * 4);
        return tileSnapshot(canvasOf(pixels, size), area, background);
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
  }, [sprite, size, eraseFill]);

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

  // The brush is round; the pen, eraser and line have a square tip.
  const tipSize = (t: PaintTool) =>
    t === "brush" ? pen.brushSize : t === "eraser" ? pen.eraserSize : pen.size;
  const hoverSize = tool === "bucket" || tool === "pipette" ? 1 : tipSize(tool);
  const hoverTip = brushTip(hoverSize, tool === "brush");
  // Tools that don't lay down the pen colour show only the outline of their tip.
  const hoverOutline = tool === "pipette" || tool === "eraser";
  // Only the pipette works on a layer that can't be drawn on.
  const blocked = !sprite.canPaint && tool !== "pipette";

  // Redraws the whole stroke, so pixel-perfect can take back a corner it already painted.
  const drawStroke = (ctx: CanvasRenderingContext2D, current: Stroke) => {
    ctx.putImageData(current.before, 0, 0);
    ctx.fillStyle = current.erase && eraseFill ? eraseFill : pen.color;
    const size = tipSize(current.tool);
    const tip = brushTip(size, current.tool === "brush");
    const points =
      current.tool === "pen"
        ? strokePixels(current.points, pen)
        : current.points;
    for (const point of points) {
      const { x, y } = brushOrigin(point, size);
      for (const r of tip) {
        // Erasing reveals the Background colour, or transparency elsewhere.
        if (current.erase && !eraseFill)
          ctx.clearRect(x + r.dx, y + r.dy, r.w, r.h);
        else ctx.fillRect(x + r.dx, y + r.dy, r.w, r.h);
      }
    }
    sprite.touched();
  };

  // The pipette picks what is seen, all layers combined.
  const pickColor = (point: Point) => {
    const pixel = screenRef.current
      ?.getContext("2d")
      ?.getImageData(point.x, point.y, 1, 1);
    const color = pixel && pixelColor(pixel, { x: 0, y: 0 });
    if (color) onPickColor?.(color);
  };

  // Repaints the area under `point` with the pen colour, or erases it.
  const fillAt = (
    ctx: CanvasRenderingContext2D,
    point: Point,
    erase: boolean,
  ) => {
    const ink = hexToRgba(pen.color);
    const fill = eraseFill ? hexToRgba(eraseFill) : null;
    const rgba = !erase
      ? [ink.r, ink.g, ink.b, 255]
      : fill
        ? [fill.r, fill.g, fill.b, 255]
        : [0, 0, 0, 0];
    const image = ctx.getImageData(0, 0, size.w, size.h);
    const start = (point.y * size.w + point.x) * 4;
    if (rgba.every((v, c) => image.data[start + c] === v)) return;
    for (const i of fillPoints(image, point, pen.contiguous)) {
      image.data.set(rgba, i * 4);
    }
    ctx.putImageData(image, 0, 0);
    sprite.commit();
  };

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // While a frame is being placed, clicks on the tile must not paint.
    if (frame || (e.button !== 0 && e.button !== 2)) return;
    const point = pixelAt(e);
    // Alt+click picks a colour whatever the tool, as in Aseprite.
    if (tool === "pipette" || (e.altKey && e.button === 0))
      return pickColor(point);
    if (blocked) return;
    // A layer with nothing in this frame yet gets its cel now.
    const ctx = sprite.context(true);
    if (!ctx) return;
    const erase = e.button === 2 || tool === "eraser";
    if (tool === "bucket") return fillAt(ctx, point, erase);
    e.currentTarget.setPointerCapture(e.pointerId);
    stroke.current = {
      tool,
      points:
        tool !== "line" && e.shiftKey && lastPoint.current
          ? linePoints(lastPoint.current, point)
          : [point],
      erase,
      before: ctx.getImageData(0, 0, size.w, size.h),
    };
    drawStroke(ctx, stroke.current);
  };

  const moveStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pixelAt(e);
    setHover(point);
    const current = stroke.current;
    const ctx = sprite.context();
    if (!current || !ctx) return;
    let points: Point[];
    if (current.tool === "line") {
      // A line is redrawn from its start; Shift keeps it to 45° steps.
      const from = current.points[0]!;
      const to = e.shiftKey ? snapLine(from, point) : point;
      const end = current.points.at(-1)!;
      if (end.x === to.x && end.y === to.y) return;
      points = linePoints(from, to);
    } else {
      points = extendStroke(current.points, point);
      if (points === current.points) return;
    }
    current.points = points;
    drawStroke(ctx, current);
  };

  const endStroke = () => {
    if (!stroke.current) return;
    lastPoint.current = stroke.current.points.at(-1) ?? lastPoint.current;
    stroke.current = null;
    sprite.commit();
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
    if (pending && !sameSize(pending, size)) sprite.resize(pending);
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
          ref={screenRef}
          width={size.w}
          height={size.h}
          aria-label="Tile canvas"
          title={
            blocked && !selecting
              ? "This layer can’t be drawn on: pick a visible, unlocked layer"
              : undefined
          }
          className={`block size-full touch-none [image-rendering:pixelated] ${blocked && !selecting ? "cursor-not-allowed" : "cursor-crosshair"}`}
          onPointerDown={selecting ? startSelect : startStroke}
          onPointerMove={selecting ? moveSelect : moveStroke}
          onPointerUp={selecting ? endSelect : endStroke}
          onPointerCancel={selecting ? endSelect : endStroke}
          onPointerLeave={() => setHover(null)}
          onContextMenu={(e) => e.preventDefault()}
        />

        {hover && !pending && !selecting && !frame && !blocked && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {hoverTip.map((r) => (
              <div
                key={r.dy}
                className={
                  hoverOutline
                    ? "absolute outline outline-1 outline-white/80"
                    : "absolute opacity-50"
                }
                style={{
                  left: (brushOrigin(hover, hoverSize).x + r.dx) * scale,
                  top: (brushOrigin(hover, hoverSize).y + r.dy) * scale,
                  width: r.w * scale,
                  height: r.h * scale,
                  backgroundColor: hoverOutline ? undefined : pen.color,
                }}
              />
            ))}
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
