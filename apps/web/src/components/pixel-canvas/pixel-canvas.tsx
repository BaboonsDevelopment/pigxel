"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { ellipsePoints, rectPoints } from "@/lib/edit/raster";
import { frameIndex } from "@/lib/sprite/frames";
import { FrameEditor } from "./components/frame-editor";
import { SelectionOverlay } from "./components/selection-overlay";
import {
  CHECKER_STYLE,
  GRID_STYLE,
  HANDLES,
  MAJOR_GRID_STYLE,
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
  inPattern,
  mirrored,
  paintPoints,
  paintStamp,
  rgbaOf,
  shadingInk,
  wrapPixel,
  type Ink,
  type PaintOptions,
  type Rgba,
  type Stamp,
  type TiledMode,
} from "./paint";
import {
  SELECTION_TOOLS,
  brushOrigin,
  brushTip,
  extendStroke,
  fillPoints,
  linePoints,
  pixelColor,
  snapLine,
  squareFrom,
  strokePixels,
  type PaintTool,
  type PenSettings,
  type Point,
} from "./pen";
import {
  isSelected,
  maskOutline,
  polygonMask,
  rectMask,
  selectModeOf,
  wandMask,
  type SelectMode,
} from "./selection";
import type { SelectionApi } from "./use-selection";
import type { SpriteApi } from "./use-sprite";
import { onionFrames, type CanvasView } from "./view";

type Stroke = {
  /** The tool that started the stroke: a freehand tool, the line or a shape. */
  tool: PaintTool;
  /** Pixels the tip passes through; a line or shape keeps its start as the first one. */
  points: Point[];
  /** Where a line or shape is dragged to. */
  end: Point;
  rgba: Rgba;
  /** Started with the right button: the secondary colour, or shading backwards. */
  secondary: boolean;
  /** The colour laid down, for the recent colours; null when erasing. */
  color: string | null;
  /** The cel before the stroke, so each redraw starts from it. */
  before: Uint8ClampedArray;
};

/** A selection being dragged out, or selected pixels being moved. */
type SelectDrag =
  | { kind: "marquee"; from: Point; to: Point; mode: SelectMode }
  | { kind: "lasso"; points: Point[]; mode: SelectMode }
  | { kind: "move"; from: Point };

export type ColorSlot = "primary" | "secondary";

/**
 * Lets the page work with the canvas from outside, e.g. the AI: what the
 * frame on screen shows, and choosing areas on it. Cels are changed through
 * the sprite instead.
 */
export type PixelCanvasHandle = {
  /** The RGBA of `area` on the whole tile, every layer combined. */
  readTile: (area: Area) => Uint8ClampedArray;
  /** True when nothing is drawn on any layer but the Background. */
  isEmpty: () => boolean;
  /** The biggest empty spot on the tile, or null when it is too full. */
  freeArea: () => Area | null;
  /** The tile (or `area` of it) as an enlarged PNG data URL, for the AI. */
  snapshot: (area?: Area, background?: string) => string;
  /** Lets the user drag out an area; null when they cancel. */
  selectArea: () => Promise<Area | null>;
  /** Shows `area` as a frame the user can move and resize; null when they cancel. */
  adjustArea: (area: Area) => Promise<Area | null>;
};

/** Where copies of the tile sit around it in tiled mode, in rows. */
function tiledCells(tiled: TiledMode): Point[] {
  const xs = tiled === "x" || tiled === "both" ? [-1, 0, 1] : [0];
  const ys = tiled === "y" || tiled === "both" ? [-1, 0, 1] : [0];
  return ys.flatMap((y) => xs.map((x) => ({ x, y })));
}

export function PixelCanvas({
  tool,
  pen,
  scale,
  sprite,
  selection,
  view,
  stamp,
  highlight,
  onPickColor,
  onUseColor,
  ref,
}: {
  tool: PaintTool;
  pen: PenSettings;
  /** Screen pixels per tile pixel. */
  scale: number;
  sprite: SpriteApi;
  selection: SelectionApi;
  view: CanvasView;
  /** A picture the pen and brush paint with instead of their tip. */
  stamp: Stamp | null;
  /** An area to point out, e.g. where a picture would go. */
  highlight?: Area | null;
  /** Called with the colour the pipette (or Alt+click) picked up. */
  onPickColor?: (color: string, slot: ColorSlot) => void;
  /** Called with the colour of each finished stroke or fill. */
  onUseColor?: (color: string) => void;
  ref?: Ref<PixelCanvasHandle>;
}) {
  const { size } = sprite;
  const { symmetry, tiled } = view;
  const [pending, setPending] = useState<Size | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [aiArea, setAiArea] = useState<Area | null>(null);
  const [selectDrag, setSelectDrag] = useState<SelectDrag | null>(null);
  const screenRef = useRef<HTMLCanvasElement>(null);
  const onionRef = useRef<HTMLCanvasElement>(null);
  const copies = useRef(new Set<HTMLCanvasElement>());
  const stroke = useRef<Stroke>(null);
  // Where the last stroke ended; Shift+click draws a straight line from here.
  const lastPoint = useRef<Point>(null);
  const drag = useRef<ResizeDrag>(null);
  const aiFrom = useRef<Point>(null);
  const resolveAiArea = useRef<(area: Area | null) => void>(null);
  const [frame, setFrame] = useState<Area | null>(null);
  const resolveFrame = useRef<(area: Area | null) => void>(null);
  const { mask } = selection;
  const outline = useMemo(
    () => (mask ? maskOutline(mask, size) : ""),
    [mask, size],
  );
  const paintOptions: PaintOptions = {
    size,
    symmetry,
    tiled,
    mask,
    density: pen.density,
  };

  // The tiled copies show what the tile shows.
  const paintCopy = (copy: HTMLCanvasElement) => {
    const ctx = copy.getContext("2d");
    if (!ctx || !screenRef.current) return;
    ctx.clearRect(0, 0, copy.width, copy.height);
    ctx.drawImage(screenRef.current, 0, 0);
  };

  // Onion skin: the frames around the active one, faint, red before and
  // blue after, as in Aseprite. The Background and references are left out.
  const paintOnion = () => {
    const ctx = onionRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size.w, size.h);
    const { frames } = sprite;
    const around = onionFrames(
      view.onion,
      frameIndex(frames, sprite.frameId),
      frames.length,
    );
    if (!around.length) return;
    const out = new Uint8ClampedArray(size.w * size.h * 4);
    // Farthest first, so the nearest frames end up on top.
    for (const { index, before, strength } of around.reverse()) {
      const pixels = sprite.composite(
        ["reference", "background"],
        frames[index]!.id,
      );
      const tint = before ? [255, 70, 90] : [60, 130, 255];
      for (let i = 0; i < pixels.length; i += 4) {
        if (!pixels[i + 3]) continue;
        for (let c = 0; c < 3; c++)
          out[i + c] = (pixels[i + c]! + tint[c]!) / 2;
        out[i + 3] = pixels[i + 3]! * 0.4 * strength;
      }
    }
    ctx.putImageData(
      new ImageData(out as Uint8ClampedArray<ArrayBuffer>, size.w, size.h),
      0,
      0,
    );
  };

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
    for (const copy of copies.current) paintCopy(copy);
    paintOnion();
  });
  useLayoutEffect(
    () => paintScreen(),
    [
      sprite.version,
      sprite.tree,
      sprite.frameId,
      sprite.frames,
      size,
      view.onion,
    ],
  );

  const finishAiArea = useCallback((area: Area | null) => {
    resolveAiArea.current?.(area);
    resolveAiArea.current = null;
    aiFrom.current = null;
    setAiArea(null);
    setSelecting(false);
  }, []);

  const finishFrame = useCallback((area: Area | null) => {
    resolveFrame.current?.(area);
    resolveFrame.current = null;
    setFrame(null);
  }, []);

  useImperativeHandle(ref, () => {
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
      readTile(area) {
        const image = tile()
          .getContext("2d", { willReadFrequently: true })
          ?.getImageData(area.x, area.y, area.w, area.h);
        return image?.data ?? new Uint8ClampedArray(area.w * area.h * 4);
      },
      isEmpty: () => isBlank(content()),
      freeArea: () => largestEmptyArea(content()),
      snapshot: (area, background) => tileSnapshot(tile(), area, background),
      selectArea() {
        resolveAiArea.current?.(null);
        setSelecting(true);
        return new Promise<Area | null>((resolve) => {
          resolveAiArea.current = resolve;
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
  }, [sprite, size]);

  useEffect(() => {
    if (!selecting) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") finishAiArea(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selecting, finishAiArea]);

  useEffect(() => {
    if (!frame) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") finishFrame(null);
      if (e.key === "Enter") finishFrame(frame);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [frame, finishFrame]);

  const isSelectionTool = SELECTION_TOOLS.includes(tool);
  // The brush is round; the pen, eraser, line and shapes have a square tip.
  const tipSize = (t: PaintTool) =>
    t === "brush" ? pen.brushSize : t === "eraser" ? pen.eraserSize : pen.size;
  const hoverSize = tool === "bucket" || tool === "pipette" ? 1 : tipSize(tool);
  const hoverTip = brushTip(hoverSize, tool === "brush");
  // Tools that don't lay down the pen colour show only the outline of their tip.
  const hoverOutline = tool === "pipette" || tool === "eraser";
  // Selecting works on any layer; painting and moving need one that can change.
  const blocked =
    !sprite.canPaint &&
    tool !== "pipette" &&
    tool !== "marquee" &&
    tool !== "lasso" &&
    tool !== "wand";
  const overSelection =
    !!hover && isSelected(mask, size, hover) && tool !== "wand";

  // Redraws the whole stroke, so pixel-perfect can take back a corner it
  // already painted, and a line or shape follows the pointer.
  const drawStroke = (ctx: CanvasRenderingContext2D, current: Stroke) => {
    const data = new Uint8ClampedArray(current.before);
    const tipPixels = tipSize(current.tool);
    const tip = brushTip(tipPixels, current.tool === "brush");
    const origin = (p: Point) => brushOrigin(p, tipPixels);
    const start = current.points[0]!;
    const inkTool = current.tool === "pen" || current.tool === "brush";
    // Shading moves pixels along the palette: forwards with the left button.
    const ink: Ink =
      inkTool && pen.ink === "shading"
        ? shadingInk(current.before, sprite.palette, current.secondary ? -1 : 1)
        : current.rgba;
    const paint = (points: Point[], thin = false) =>
      paintPoints(
        data,
        points,
        thin ? brushTip(1, false) : tip,
        thin ? (p) => p : origin,
        ink,
        paintOptions,
      );
    if (current.tool === "rect" || current.tool === "ellipse") {
      const box = {
        x: Math.min(start.x, current.end.x),
        y: Math.min(start.y, current.end.y),
        w: Math.abs(current.end.x - start.x) + 1,
        h: Math.abs(current.end.y - start.y) + 1,
      };
      const shape = current.tool === "rect" ? rectPoints : ellipsePoints;
      if (pen.fillShapes) paint(shape(box, true), true);
      paint(shape(box, false));
    } else if (current.tool === "line") {
      paint(linePoints(start, current.end));
    } else if (inkTool && stamp) {
      // A picture brush: its own colours, or a silhouette with the right button.
      paintStamp(
        data,
        current.points,
        stamp,
        current.secondary ? current.rgba : null,
        paintOptions,
      );
    } else {
      paint(
        current.tool === "pen"
          ? strokePixels(current.points, pen)
          : current.points,
      );
    }
    ctx.putImageData(
      new ImageData(data as Uint8ClampedArray<ArrayBuffer>, size.w),
      0,
      0,
    );
    sprite.touched();
  };

  // The pipette picks what is seen, all layers combined.
  const pickColor = (point: Point, slot: ColorSlot) => {
    const at = wrapPixel(point.x, point.y, size, tiled);
    const pixel =
      at && screenRef.current?.getContext("2d")?.getImageData(at.x, at.y, 1, 1);
    const color = pixel && pixelColor(pixel, { x: 0, y: 0 });
    if (color) onPickColor?.(color, slot);
  };

  // Repaints the area under `point` (and its mirror copies) with `rgba`.
  const fillAt = (
    ctx: CanvasRenderingContext2D,
    point: Point,
    rgba: Rgba,
    color: string | null,
  ) => {
    const image = ctx.getImageData(0, 0, size.w, size.h);
    let changed = false;
    for (const copy of mirrored(point, size, symmetry)) {
      const at = wrapPixel(copy.x, copy.y, size, tiled);
      // Inside a selection, only a click on it fills.
      if (!at || (mask && !isSelected(mask, size, at))) continue;
      const start = (at.y * size.w + at.x) * 4;
      if (rgba.every((v, c) => image.data[start + c] === v)) continue;
      for (const i of fillPoints(image, at, pen.contiguous)) {
        if (mask && !mask[i]) continue;
        if (!inPattern(i % size.w, Math.floor(i / size.w), pen.density))
          continue;
        image.data.set(rgba, i * 4);
        changed = true;
      }
    }
    if (!changed) return;
    ctx.putImageData(image, 0, 0);
    sprite.commit();
    if (color) onUseColor?.(color);
  };

  const startSelect = (e: React.PointerEvent<HTMLCanvasElement>, p: Point) => {
    if (e.button !== 0) return;
    const mode = selectModeOf(e);
    const inside = isSelected(mask, size, p);
    if (tool === "move" || (mode === "replace" && inside && tool !== "wand")) {
      if (!sprite.canPaint) return;
      if (!selection.beginMove(tool === "move" && !mask)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelectDrag({ kind: "move", from: p });
      return;
    }
    if (tool === "wand") {
      const cel = sprite.readCel(sprite.layerId, sprite.frameId);
      selection.select(wandMask(cel, size, p, pen.contiguous), mode);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectDrag(
      tool === "lasso"
        ? { kind: "lasso", points: [p], mode }
        : { kind: "marquee", from: p, to: p, mode },
    );
  };

  const moveSelect = (p: Point) => {
    if (!selectDrag) return;
    if (selectDrag.kind === "move")
      selection.moveTo(p.x - selectDrag.from.x, p.y - selectDrag.from.y);
    else if (selectDrag.kind === "marquee") {
      if (p.x !== selectDrag.to.x || p.y !== selectDrag.to.y)
        setSelectDrag({ ...selectDrag, to: p });
    } else {
      const points = extendStroke(selectDrag.points, p);
      if (points !== selectDrag.points)
        setSelectDrag({ ...selectDrag, points });
    }
  };

  const endSelect = () => {
    const current = selectDrag;
    setSelectDrag(null);
    if (!current) return;
    if (current.kind === "move") return selection.endMove();
    if (current.kind === "marquee") {
      const { from, to, mode } = current;
      // A click without a drag clears the selection, as in Aseprite.
      if (from.x === to.x && from.y === to.y && mode === "replace")
        return selection.deselect();
      return selection.select(
        rectMask(size, areaBetween(from, to, size)),
        mode,
      );
    }
    if (current.points.length < 3 && current.mode === "replace")
      return selection.deselect();
    selection.select(polygonMask(size, current.points), current.mode);
  };

  const startPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // While a frame is being placed, clicks on the tile must not paint.
    if (frame || (e.button !== 0 && e.button !== 2)) return;
    const point = pixelAt(e);
    const slot: ColorSlot = e.button === 2 ? "secondary" : "primary";
    // Alt+click picks a colour with the drawing tools, as in Aseprite
    // (selection tools use Alt to take away from the selection).
    if (tool === "pipette" || (e.altKey && !isSelectionTool))
      return pickColor(point, slot);
    if (isSelectionTool) return startSelect(e, point);
    if (blocked) return;
    // Drawing puts lifted pixels down first.
    selection.drop();
    // A layer with nothing in this frame yet gets its cel now.
    const ctx = sprite.context(true);
    if (!ctx) return;
    const erase = tool === "eraser";
    const color = erase ? null : slot === "primary" ? pen.color : pen.secondary;
    const rgba: Rgba = color
      ? rgbaOf(color)
      : sprite.eraseFill
        ? rgbaOf(sprite.eraseFill)
        : [0, 0, 0, 0];
    if (tool === "bucket") return fillAt(ctx, point, rgba, color);
    e.currentTarget.setPointerCapture(e.pointerId);
    const freehand = tool === "pen" || tool === "brush" || erase;
    const shading =
      pen.ink === "shading" && (tool === "pen" || tool === "brush") && !stamp;
    stroke.current = {
      tool,
      points:
        freehand && e.shiftKey && lastPoint.current
          ? linePoints(lastPoint.current, point)
          : [point],
      end: point,
      rgba,
      secondary: slot === "secondary",
      // Shading and picture brushes don't lay down one colour.
      color: shading || (stamp && freehand && !erase) ? null : color,
      before: new Uint8ClampedArray(
        ctx.getImageData(0, 0, size.w, size.h).data,
      ),
    };
    drawStroke(ctx, stroke.current);
  };

  const movePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pixelAt(e);
    const at = wrapPixel(point.x, point.y, size, tiled);
    setHover((h) => (at && h?.x === at.x && h.y === at.y ? h : (at ?? null)));
    if (selectDrag) return moveSelect(point);
    const current = stroke.current;
    const ctx = sprite.context();
    if (!current || !ctx) return;
    if (
      current.tool === "line" ||
      current.tool === "rect" ||
      current.tool === "ellipse"
    ) {
      // Lines and shapes are redrawn from their start; Shift keeps a line to
      // 45° steps and makes a shape a square or circle.
      const from = current.points[0]!;
      const end =
        current.tool === "line"
          ? e.shiftKey
            ? snapLine(from, point)
            : point
          : squareFrom(from, point, e.shiftKey);
      if (end.x === current.end.x && end.y === current.end.y) return;
      current.end = end;
    } else {
      const points = extendStroke(current.points, point);
      if (points === current.points) return;
      current.points = points;
    }
    drawStroke(ctx, current);
  };

  const endPointer = () => {
    if (selectDrag) return endSelect();
    const current = stroke.current;
    if (!current) return;
    lastPoint.current =
      current.tool === "line" ? current.end : (current.points.at(-1) ?? null);
    stroke.current = null;
    sprite.commit();
    if (current.color) onUseColor?.(current.color);
  };

  const startAiArea = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    aiFrom.current = pixelAt(e);
    setAiArea(areaBetween(aiFrom.current, aiFrom.current, size));
  };

  const moveAiArea = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (aiFrom.current) {
      setAiArea(areaBetween(aiFrom.current, pixelAt(e), size));
    }
  };

  const endAiArea = () => {
    if (aiFrom.current) finishAiArea(aiArea);
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

  const pointerHandlers = {
    onPointerDown: selecting ? startAiArea : startPointer,
    onPointerMove: selecting ? moveAiArea : movePointer,
    onPointerUp: selecting ? endAiArea : endPointer,
    onPointerCancel: selecting ? endAiArea : endPointer,
    onPointerLeave: () => setHover(null),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  const cursor =
    blocked && !selecting
      ? "cursor-not-allowed"
      : tool === "move" || (overSelection && isSelectionTool)
        ? "cursor-move"
        : "cursor-crosshair";
  const tileStyle = { width: size.w * scale, height: size.h * scale };
  const showTip =
    hover &&
    !pending &&
    !selecting &&
    !frame &&
    !blocked &&
    !isSelectionTool &&
    !selectDrag;
  const stampTip = stamp && (tool === "pen" || tool === "brush") ? stamp : null;
  const lasso = selectDrag?.kind === "lasso" ? selectDrag.points : null;
  const marquee =
    selectDrag?.kind === "marquee"
      ? areaBetween(selectDrag.from, selectDrag.to, size)
      : null;

  const tile = (
    <div
      className={`group relative shadow-[0_0_0_1px_var(--color-border),0_18px_48px_rgba(0,0,0,0.25)] ${selecting ? "z-50" : ""}`}
      style={{ ...tileStyle, ...CHECKER_STYLE }}
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
        className={`block size-full touch-none [image-rendering:pixelated] ${cursor}`}
        {...pointerHandlers}
      />
      <canvas
        ref={onionRef}
        width={size.w}
        height={size.h}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full [image-rendering:pixelated]"
      />

      {showTip && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {mirrored(hover, size, symmetry).flatMap((at, copy) =>
            stampTip ? (
              <div
                key={copy}
                className="absolute outline outline-1 outline-dashed outline-foreground/70"
                style={{
                  left: (at.x - Math.floor((stampTip.w - 1) / 2)) * scale,
                  top: (at.y - Math.floor((stampTip.h - 1) / 2)) * scale,
                  width: stampTip.w * scale,
                  height: stampTip.h * scale,
                }}
              />
            ) : (
              hoverTip.map((r) => (
                <div
                  key={`${copy}:${r.dy}`}
                  className={
                    hoverOutline
                      ? "absolute outline outline-1 outline-white/80"
                      : "absolute opacity-50"
                  }
                  style={{
                    left: (brushOrigin(at, hoverSize).x + r.dx) * scale,
                    top: (brushOrigin(at, hoverSize).y + r.dy) * scale,
                    width: r.w * scale,
                    height: r.h * scale,
                    backgroundColor: hoverOutline ? undefined : pen.color,
                  }}
                />
              ))
            ),
          )}
        </div>
      )}

      {view.pixelGrid && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ ...GRID_STYLE, backgroundSize: `${scale}px ${scale}px` }}
        />
      )}
      {view.gridSize > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            ...MAJOR_GRID_STYLE,
            backgroundSize: `${view.gridSize * scale}px ${view.gridSize * scale}px`,
          }}
        />
      )}

      {(symmetry === "horizontal" || symmetry === "both") && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 border-l border-dashed border-fuchsia-500"
          style={{ left: (size.w / 2) * scale }}
        />
      )}
      {(symmetry === "vertical" || symmetry === "both") && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-fuchsia-500"
          style={{ top: (size.h / 2) * scale }}
        />
      )}

      {(outline || marquee || lasso) && (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          {outline && (
            <>
              <path
                d={outline}
                fill="none"
                stroke="white"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={outline}
                fill="none"
                stroke="black"
                strokeWidth={1}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
                className="motion-safe:animate-[marching-ants_0.8s_linear_infinite]"
              />
            </>
          )}
          {marquee && (
            <rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill="rgb(59 130 246 / 0.12)"
              stroke="rgb(59 130 246)"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {lasso && (
            <polyline
              points={lasso.map((p) => `${p.x + 0.5},${p.y + 0.5}`).join(" ")}
              fill="rgb(59 130 246 / 0.12)"
              stroke="rgb(59 130 246)"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      )}

      {marquee && (
        <span
          className="pointer-events-none absolute rounded bg-blue-500 px-2 py-0.5 text-xs whitespace-nowrap text-white tabular-nums"
          style={{
            left: (marquee.x + marquee.w) * scale,
            top: (marquee.y + marquee.h) * scale + 4,
          }}
        >
          {marquee.w} × {marquee.h}
        </span>
      )}

      {aiArea && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-blue-500 bg-blue-500/15"
          style={{
            left: aiArea.x * scale,
            top: aiArea.y * scale,
            width: aiArea.w * scale,
            height: aiArea.h * scale,
          }}
        >
          <span className="absolute right-0 -bottom-7 rounded bg-blue-500 px-2 py-0.5 text-xs whitespace-nowrap text-white tabular-nums">
            {aiArea.w} × {aiArea.h}
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
        tiled === "none" &&
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
  );

  const cells = tiledCells(tiled);
  return (
    <>
      {selecting && <SelectionOverlay onCancel={() => finishAiArea(null)} />}
      {cells.length === 1 ? (
        tile
      ) : (
        // Tiled mode: copies of the tile around it, which can be drawn on too.
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${tiled === "y" ? 1 : 3}, auto)`,
          }}
        >
          {cells.map((cell) =>
            cell.x === 0 && cell.y === 0 ? (
              <div key="tile" className="relative z-10">
                {tile}
              </div>
            ) : (
              <canvas
                key={`${cell.x},${cell.y}`}
                width={size.w}
                height={size.h}
                aria-hidden="true"
                ref={(copy) => {
                  if (!copy) return;
                  copies.current.add(copy);
                  paintCopy(copy);
                  return () => void copies.current.delete(copy);
                }}
                className={`block touch-none opacity-75 [image-rendering:pixelated] ${cursor}`}
                style={{ ...tileStyle, ...CHECKER_STYLE }}
                {...pointerHandlers}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}
