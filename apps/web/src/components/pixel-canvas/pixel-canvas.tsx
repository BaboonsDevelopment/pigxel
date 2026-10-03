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
import {
  nextSliceName,
  resizedSlice,
  sliceAt,
  type Slice,
} from "@/lib/slices/slices";
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
  boxBetween,
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
  blendInk,
  blurInk,
  jumbleInk,
  mirrored,
  paintGradient,
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
  clampOpacity,
  clampTolerance,
  curvePoints,
  extendStroke,
  fourConnected,
  fillPoints,
  linePoints,
  lineTip,
  pixelColor,
  snapLine,
  sprayDotCount,
  sprayDots,
  squareFrom,
  strokePixels,
  type PaintTool,
  type PenSettings,
  type Point,
} from "./pen";
import {
  ellipseMask,
  isSelected,
  maskOutline,
  polygonMask,
  rectMask,
  selectModeOf,
  wandMask,
  type Floating,
  type SelectMode,
} from "./selection";
import { SliceOverlay } from "./components/slice-overlay";
import { textPiece } from "./text";
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
  /** Picks where the jumble takes each pixel from, new for every stroke. */
  seed?: number;
  /** The curve's bend, set by the drags after the first. */
  curve?: CurveBend;
};

/**
 * A curve takes three drags: the first places its ends, the second bends it
 * (`c1` and `c2` together), the third moves `c2` alone. `held` is true while
 * one of them is being dragged.
 */
type CurveBend = { c1: Point; c2: Point; stage: 0 | 1 | 2; held: boolean };

/** What the canvas shows over an unfinished curve: its ends and bend handles. */
type CurveGuide = {
  start: Point;
  end: Point;
  c1: Point;
  c2: Point;
  stage: number;
};

/** A selection being dragged out, or selected pixels being moved. */
type SelectDrag =
  | {
      kind: "marquee";
      from: Point;
      to: Point;
      mode: SelectMode;
      /** The elliptical marquee: the ellipse that fits the dragged box. */
      ellipse: boolean;
    }
  | { kind: "lasso"; points: Point[]; mode: SelectMode }
  | PolygonDrag
  | { kind: "move"; from: Point };

/** The polygonal lasso: corners placed click by click, and where the pointer is. */
type PolygonDrag = {
  kind: "polygon";
  points: Point[];
  pointer: Point;
  mode: SelectMode;
};

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
  /** The tile pixel under a point on the screen, or null when it is off the tile. */
  tilePointAt: (clientX: number, clientY: number) => Point | null;
};

/** Why typed text draws nothing: the font has none of its letters. */
const NO_GLYPHS =
  "This font has none of these letters. For Cyrillic, pick Tiny5, DotGothic16 or Press Start 2P.";

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
  onTextPlaced,
  sliceId = null,
  onSelectSlice,
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
  /** Called when typed text is put on the tile as a floating piece, to move it. */
  onTextPlaced?: () => void;
  /** The slice picked with the Slice tool, and picking another (null for none). */
  sliceId?: string | null;
  onSelectSlice?: (id: string | null) => void;
  ref?: Ref<PixelCanvasHandle>;
}) {
  const { size } = sprite;
  const { symmetry, tiled } = view;
  const [pending, setPending] = useState<Size | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [aiArea, setAiArea] = useState<Area | null>(null);
  const [selectDrag, setSelectDrag] = useState<SelectDrag | null>(null);
  const [spraying, setSpraying] = useState(false);
  const [curveGuide, setCurveGuide] = useState<CurveGuide | null>(null);
  // A slice being drawn, or the picked one being dragged by (dx, dy).
  const [sliceDrag, setSliceDrag] = useState<
    | { kind: "new"; from: Point; to: Point }
    | { kind: "move"; id: string; from: Point; dx: number; dy: number }
    | null
  >(null);
  // The text tool's box: where its text goes, in which colour, and what is typed.
  const [textBox, setTextBox] = useState<{
    at: Point;
    rgba: Rgba;
    text: string;
  } | null>(null);
  const [textPreview, setTextPreview] = useState<Floating | null>(null);
  const textInput = useRef<HTMLInputElement>(null);
  const [textError, setTextError] = useState<string | null>(null);
  // The corners of an unfinished polygon and where the pointer is, for the guides.
  const [paintPolygon, setPaintPolygon] = useState<{
    points: Point[];
    pointer: Point;
  } | null>(null);
  // Picking another tool drops a polygon that isn't closed yet.
  const [polygonTool, setPolygonTool] = useState(tool);
  if (polygonTool !== tool) {
    setPolygonTool(tool);
    if (selectDrag?.kind === "polygon") setSelectDrag(null);
  }
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
      tilePointAt(clientX, clientY) {
        const box = screenRef.current?.getBoundingClientRect();
        if (!box?.width || !box.height) return null;
        const x = Math.floor(((clientX - box.left) / box.width) * size.w);
        const y = Math.floor(((clientY - box.top) / box.height) * size.h);
        return x >= 0 && y >= 0 && x < size.w && y < size.h ? { x, y } : null;
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
  // The brush and blur are round (and share a size); the pen, eraser, line
  // and shapes have a square tip. The spray's "tip" is the circle it
  // scatters dots in.
  const roundTip = (t: PaintTool) =>
    t === "brush" || t === "blur" || t === "jumble";
  const tipSize = (t: PaintTool) =>
    roundTip(t)
      ? pen.brushSize
      : t === "eraser"
        ? pen.eraserSize
        : t === "spray"
          ? pen.sprayWidth * 2 + 1
          : pen.size;
  const hoverSize =
    tool === "bucket" ||
    tool === "gradient" ||
    tool === "contour" ||
    tool === "polygon" ||
    tool === "pipette"
      ? 1
      : tipSize(tool);
  // The brush can be a calligraphy line instead of round.
  const lineBrush = (t: PaintTool) =>
    t === "brush" && pen.brushShape === "line";
  const tipOf = (t: PaintTool, size: number) =>
    lineBrush(t)
      ? lineTip(size, pen.brushAngle)
      : brushTip(size, roundTip(t) || t === "spray");
  const hoverTip = tipOf(tool, hoverSize);
  // Tools that don't lay down the pen colour show only the outline of their tip.
  const hoverOutline =
    tool === "pipette" ||
    tool === "eraser" ||
    tool === "spray" ||
    tool === "blur" ||
    tool === "jumble";
  // Selecting works on any layer; painting and moving need one that can change.
  const blocked =
    !sprite.canPaint &&
    tool !== "pipette" &&
    tool !== "marquee" &&
    tool !== "ellipseMarquee" &&
    tool !== "lasso" &&
    tool !== "polygonLasso" &&
    tool !== "slice" &&
    tool !== "wand";
  const overSelection =
    !!hover && isSelected(mask, size, hover) && tool !== "wand";

  // Redraws the whole stroke, so pixel-perfect can take back a corner it
  // already painted, and a line or shape follows the pointer.
  const drawStroke = (ctx: CanvasRenderingContext2D, current: Stroke) => {
    const data = new Uint8ClampedArray(current.before);
    const tipPixels = tipSize(current.tool);
    const tip = tipOf(current.tool, tipPixels);
    const origin = (p: Point) => brushOrigin(p, tipPixels);
    const start = current.points[0]!;
    const inkTool = current.tool === "pen" || current.tool === "brush";
    // The tools with an Ink setting; the rest paint the plain colour.
    const inked =
      inkTool ||
      current.tool === "spray" ||
      current.tool === "contour" ||
      current.tool === "polygon";
    const ink: Ink =
      current.tool === "blur"
        ? blurInk(current.before, size)
        : current.tool === "jumble"
          ? jumbleInk(current.before, size, current.seed ?? 0)
          : !inked
            ? current.rgba
            : pen.ink === "shading"
              ? // Moves pixels along the palette: forwards with the left button.
                shadingInk(
                  current.before,
                  sprite.palette,
                  current.secondary ? -1 : 1,
                )
              : blendInk(
                  current.before,
                  [
                    current.rgba[0],
                    current.rgba[1],
                    current.rgba[2],
                    clampOpacity(pen.opacity),
                  ],
                  pen.ink,
                );
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
    } else if (current.curve) {
      const { c1, c2 } = current.curve;
      paint(strokePixels(curvePoints(start, c1, c2, current.end), pen));
    } else if (current.tool === "spray") {
      paint(current.points, true);
    } else if (current.tool === "contour" || current.tool === "polygon") {
      // The outline drawn so far, closed back to its start and filled; an
      // unfinished polygon reaches to the pointer.
      const inside = polygonMask(
        size,
        current.tool === "polygon"
          ? [...current.points, current.end]
          : current.points,
      );
      const points: Point[] = [];
      inside.forEach((on, i) => {
        if (on) points.push({ x: i % size.w, y: Math.floor(i / size.w) });
      });
      paint(points, true);
    } else if (current.tool === "gradient") {
      // Until the line has a length there is no direction, so nothing changes.
      // The right button runs the gradient the other way round.
      const primary = rgbaOf(pen.color);
      const secondary = rgbaOf(pen.secondary);
      if (start.x !== current.end.x || start.y !== current.end.y)
        paintGradient(
          data,
          start,
          current.end,
          current.secondary ? secondary : primary,
          current.secondary ? primary : secondary,
          pen.gradientShape,
          pen.gradientDither,
          paintOptions,
        );
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
          : lineBrush(current.tool)
            ? fourConnected(current.points)
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

  // While the spray is held it keeps laying dots, even with the pointer still:
  // `seconds` since the last frame decides how many.
  const sprayTick = useEffectEvent((seconds: number) => {
    const current = stroke.current;
    const ctx = sprite.context();
    if (current?.tool !== "spray" || !ctx) return;
    const count = sprayDotCount(pen.spraySpeed, seconds);
    // The fraction left over becomes a dot now and then, so slow speeds still spray.
    const dots = Math.floor(count) + (Math.random() < count % 1 ? 1 : 0);
    if (!dots) return;
    current.points.push(...sprayDots(current.end, pen.sprayWidth, dots));
    drawStroke(ctx, current);
  });
  useEffect(() => {
    if (!spraying) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      sprayTick((now - last) / 1000);
      last = now;
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [spraying]);

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
    // With "All layers", what is seen (references aside) sets where the fill
    // stops, e.g. outlines on a layer above; it still paints this layer.
    const allLayers = pen.fillFrom === "all";
    const bounds = allLayers
      ? new ImageData(
          sprite.composite(["reference"]) as Uint8ClampedArray<ArrayBuffer>,
          size.w,
          size.h,
        )
      : image;
    let changed = false;
    for (const copy of mirrored(point, size, symmetry)) {
      const at = wrapPixel(copy.x, copy.y, size, tiled);
      // Inside a selection, only a click on it fills.
      if (!at || (mask && !isSelected(mask, size, at))) continue;
      const start = (at.y * size.w + at.x) * 4;
      if (!allLayers && rgba.every((v, c) => image.data[start + c] === v))
        continue;
      for (const i of fillPoints(
        bounds,
        at,
        pen.contiguous,
        clampTolerance(pen.tolerance),
      )) {
        if (mask && !mask[i]) continue;
        if (!inPattern(i % size.w, Math.floor(i / size.w), pen.density))
          continue;
        if (rgba.some((v, c) => image.data[i * 4 + c] !== v)) changed = true;
        image.data.set(rgba, i * 4);
      }
    }
    if (!changed) return;
    ctx.putImageData(image, 0, 0);
    sprite.commit();
    if (color) onUseColor?.(color);
  };

  const startSelect = (e: React.PointerEvent<HTMLCanvasElement>, p: Point) => {
    if (e.button !== 0) return;
    if (selectDrag?.kind === "polygon") return addCorner(selectDrag, p);
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
      selection.select(
        wandMask(cel, size, p, pen.contiguous, clampTolerance(pen.tolerance)),
        mode,
      );
      return;
    }
    if (tool === "polygonLasso")
      return setSelectDrag({ kind: "polygon", points: [p], pointer: p, mode });
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectDrag(
      tool === "lasso"
        ? { kind: "lasso", points: [p], mode }
        : {
            kind: "marquee",
            from: p,
            to: p,
            mode,
            ellipse: tool === "ellipseMarquee",
          },
    );
  };

  // Shift while dragging the elliptical marquee makes a circle.
  const moveSelect = (p: Point, shift: boolean) => {
    if (!selectDrag) return;
    if (selectDrag.kind === "move")
      selection.moveTo(p.x - selectDrag.from.x, p.y - selectDrag.from.y);
    else if (selectDrag.kind === "marquee") {
      const to = selectDrag.ellipse ? squareFrom(selectDrag.from, p, shift) : p;
      if (to.x !== selectDrag.to.x || to.y !== selectDrag.to.y)
        setSelectDrag({ ...selectDrag, to });
    } else if (selectDrag.kind === "polygon") {
      if (p.x !== selectDrag.pointer.x || p.y !== selectDrag.pointer.y)
        setSelectDrag({ ...selectDrag, pointer: p });
    } else {
      const points = extendStroke(selectDrag.points, p);
      if (points !== selectDrag.points)
        setSelectDrag({ ...selectDrag, points });
    }
  };

  // The polygon is closed by a click on its first corner, a double click or Enter.
  const addCorner = (current: PolygonDrag, p: Point) => {
    const [first] = current.points;
    const last = current.points.at(-1)!;
    if (current.points.length >= 3 && p.x === first!.x && p.y === first!.y)
      return closePolygon(current);
    if (p.x !== last.x || p.y !== last.y)
      setSelectDrag({ ...current, points: [...current.points, p] });
  };

  const closePolygon = (current: PolygonDrag) => {
    setSelectDrag(null);
    // Fewer than three corners make no area: the polygon is just dropped.
    if (current.points.length >= 3)
      selection.select(polygonMask(size, current.points), current.mode);
  };

  // Enter closes the polygon and Esc drops it, before the editor's own
  // Enter (drop the selection) and Esc (deselect) see the key.
  const polygon = selectDrag?.kind === "polygon" ? selectDrag : null;
  const onPolygonKey = useEffectEvent((e: KeyboardEvent) => {
    if (!polygon || (e.key !== "Enter" && e.key !== "Escape")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === "Enter") closePolygon(polygon);
    else setSelectDrag(null);
  });
  const polygonOpen = polygon !== null;
  useEffect(() => {
    if (!polygonOpen) return;
    const onKeyDown = (e: KeyboardEvent) => onPolygonKey(e);
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [polygonOpen]);

  const endSelect = () => {
    const current = selectDrag;
    // The polygon stays open between clicks.
    if (current?.kind === "polygon") return;
    setSelectDrag(null);
    if (!current) return;
    if (current.kind === "move") return selection.endMove();
    if (current.kind === "marquee") {
      const { from, to, mode, ellipse } = current;
      // A click without a drag clears the selection, as in Aseprite.
      if (from.x === to.x && from.y === to.y && mode === "replace")
        return selection.deselect();
      return selection.select(
        ellipse
          ? ellipseMask(size, boxBetween(from, to))
          : rectMask(size, areaBetween(from, to, size)),
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
    // The second and third drags of a curve bend it.
    const unfinished = stroke.current;
    if (unfinished?.curve && !unfinished.curve.held) {
      e.currentTarget.setPointerCapture(e.pointerId);
      unfinished.curve.held = true;
      return bendCurve(unfinished, point);
    }
    // Each further click on an unfinished polygon places a corner.
    if (unfinished?.tool === "polygon") {
      const last = unfinished.points.at(-1)!;
      return addShapeCorner(
        unfinished,
        e.shiftKey ? snapLine(last, point) : point,
      );
    }
    // Alt+click picks a colour with the drawing tools, as in Aseprite
    // (selection tools use Alt to take away from the selection).
    if (tool === "pipette" || (e.altKey && !isSelectionTool))
      return pickColor(point, slot);
    if (isSelectionTool) return startSelect(e, point);
    if (tool === "slice") return startSlice(e, point);
    if (blocked) return;
    // A click opens the text box there, or moves it, keeping what is typed.
    // Keeping the default stops the click taking focus from the box.
    if (tool === "text") {
      e.preventDefault();
      const rgba = rgbaOf(slot === "primary" ? pen.color : pen.secondary);
      setTextError(null);
      return setTextBox((box) => ({ at: point, rgba, text: box?.text ?? "" }));
    }
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
    const freehand =
      tool === "pen" ||
      tool === "brush" ||
      tool === "blur" ||
      tool === "jumble" ||
      erase;
    const shading =
      pen.ink === "shading" &&
      (((tool === "pen" || tool === "brush") && !stamp) ||
        tool === "spray" ||
        tool === "contour" ||
        tool === "polygon");
    stroke.current = {
      tool,
      points:
        tool === "spray"
          ? sprayDots(point, pen.sprayWidth, 1)
          : freehand && e.shiftKey && lastPoint.current
            ? linePoints(lastPoint.current, point)
            : [point],
      end: point,
      rgba,
      secondary: slot === "secondary",
      // Shading and picture brushes don't lay down one colour.
      color:
        shading ||
        (stamp && freehand && !erase) ||
        tool === "gradient" ||
        tool === "blur" ||
        tool === "jumble"
          ? null
          : color,
      before: new Uint8ClampedArray(
        ctx.getImageData(0, 0, size.w, size.h).data,
      ),
      seed: tool === "jumble" ? (Math.random() * 2 ** 31) | 0 : undefined,
      // Straight until it is bent: the controls sit on the ends.
      curve:
        tool === "curve"
          ? { c1: point, c2: point, stage: 0, held: true }
          : undefined,
    };
    drawStroke(ctx, stroke.current);
    if (tool === "spray") setSpraying(true);
    if (tool === "curve") showCurve(stroke.current);
    if (tool === "polygon") showPolygon(stroke.current);
  };

  const showPolygon = (current: Stroke) =>
    setPaintPolygon({ points: [...current.points], pointer: current.end });

  // A click on the first corner closes the polygon; others add a corner.
  const addShapeCorner = (current: Stroke, point: Point) => {
    const first = current.points[0]!;
    const last = current.points.at(-1)!;
    if (
      current.points.length >= 3 &&
      point.x === first.x &&
      point.y === first.y
    )
      return closeShape(current);
    if (point.x === last.x && point.y === last.y) return;
    current.points.push(point);
    current.end = point;
    const ctx = sprite.context();
    if (ctx) drawStroke(ctx, current);
    showPolygon(current);
  };

  // Fills the polygon without the stretch to the pointer; with fewer than
  // three corners there is no area, so it is dropped.
  const closeShape = (current: Stroke) => {
    if (current.points.length < 3) return cancelStroke(current);
    current.end = current.points.at(-1)!;
    const ctx = sprite.context();
    if (ctx) drawStroke(ctx, current);
    finishStroke(current);
  };

  const showCurve = (current: Stroke) =>
    setCurveGuide(
      current.curve
        ? {
            start: current.points[0]!,
            end: current.end,
            c1: current.curve.c1,
            c2: current.curve.c2,
            stage: current.curve.stage,
          }
        : null,
    );

  // The second drag bends the curve with both controls, the third with the second alone.
  const bendCurve = (current: Stroke, point: Point) => {
    const ctx = sprite.context();
    if (!current.curve || !ctx) return;
    if (current.curve.stage === 1) {
      current.curve.c1 = point;
      current.curve.c2 = point;
    } else current.curve.c2 = point;
    drawStroke(ctx, current);
    showCurve(current);
  };

  const finishStroke = (current: Stroke) => {
    lastPoint.current =
      current.tool === "line" || current.curve
        ? current.end
        : (current.points.at(-1) ?? null);
    stroke.current = null;
    setSpraying(false);
    setCurveGuide(null);
    setPaintPolygon(null);
    sprite.commit();
    if (current.color) onUseColor?.(current.color);
  };

  // Esc puts the cel back as it was before the curve or polygon.
  const cancelStroke = (current: Stroke) => {
    stroke.current = null;
    setCurveGuide(null);
    setPaintPolygon(null);
    const ctx = sprite.context();
    if (!ctx) return;
    ctx.putImageData(
      new ImageData(current.before as Uint8ClampedArray<ArrayBuffer>, size.w),
      0,
      0,
    );
    sprite.touched();
  };

  // Enter finishes an unfinished curve or polygon as it is, Esc drops it,
  // before the editor's own Enter and Esc see the key.
  const onShapeKey = useEffectEvent((e: KeyboardEvent) => {
    const current = stroke.current;
    const open = current?.curve || current?.tool === "polygon";
    if (!current || !open || (e.key !== "Enter" && e.key !== "Escape")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === "Escape") cancelStroke(current);
    else if (current.curve) finishStroke(current);
    else closeShape(current);
  });
  const shapeOpen = curveGuide !== null || paintPolygon !== null;
  useEffect(() => {
    if (!shapeOpen) return;
    const onKeyDown = (e: KeyboardEvent) => onShapeKey(e);
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [shapeOpen]);

  // Picking another tool, layer or frame keeps an unfinished curve or
  // polygon as it is, so its next clicks can't land on another cel.
  const keepShape = useEffectEvent(() => {
    const current = stroke.current;
    if (current?.curve) finishStroke(current);
    else if (current?.tool === "polygon") closeShape(current);
  });
  useEffect(() => keepShape(), [tool, sprite.layerId, sprite.frameId]);

  // The text box shows only with the text tool; switching away drops it.
  const openText = tool === "text" ? textBox : null;

  // The typed text, drawn as it will land on the tile.
  useEffect(() => {
    if (!openText) return;
    let live = true;
    void textPiece(
      openText.text,
      pen.textFont,
      pen.textScale,
      openText.rgba,
      openText.at.x,
      openText.at.y,
    ).then((piece) => {
      if (live) setTextPreview(piece);
    });
    return () => {
      live = false;
    };
  }, [openText, pen.textFont, pen.textScale]);

  // Typing goes to the box wherever it was opened or moved to.
  const textAt = openText?.at;
  useEffect(() => textInput.current?.focus(), [textAt]);

  // Enter puts the text on the tile as a floating piece, to move and drop
  // like a paste; it stays inside the tile.
  const placeText = async () => {
    if (!openText) return;
    const piece = await textPiece(
      openText.text,
      pen.textFont,
      pen.textScale,
      openText.rgba,
      openText.at.x,
      openText.at.y,
    );
    // The box stays open, saying why, when there is nothing to put down.
    if (!piece) return setTextError(NO_GLYPHS);
    if (!selection.paste(piece))
      return setTextError("Pick a visible, unlocked layer to put the text on.");
    setTextBox(null);
    setTextPreview(null);
    onTextPlaced?.();
  };

  // A press on a slice picks it and drags it; elsewhere it draws a new one.
  const startSlice = (e: React.PointerEvent<HTMLCanvasElement>, p: Point) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const picked = sprite.slices.find((s) => s.id === sliceId);
    const hit =
      picked && sliceAt([picked], p.x, p.y)
        ? picked
        : sliceAt(sprite.slices, p.x, p.y);
    if (hit) {
      onSelectSlice?.(hit.id);
      setSliceDrag({ kind: "move", id: hit.id, from: p, dx: 0, dy: 0 });
    } else setSliceDrag({ kind: "new", from: p, to: p });
  };

  const moveSlice = (p: Point) => {
    if (!sliceDrag) return;
    if (sliceDrag.kind === "new") {
      if (p.x !== sliceDrag.to.x || p.y !== sliceDrag.to.y)
        setSliceDrag({ ...sliceDrag, to: p });
      return;
    }
    const dx = p.x - sliceDrag.from.x;
    const dy = p.y - sliceDrag.from.y;
    if (dx !== sliceDrag.dx || dy !== sliceDrag.dy)
      setSliceDrag({ ...sliceDrag, dx, dy });
  };

  // A click on an empty spot leaves no slice picked.
  const endSlice = () => {
    const drag = sliceDrag;
    setSliceDrag(null);
    if (!drag) return;
    if (drag.kind === "move") {
      if (!drag.dx && !drag.dy) return;
      return sprite.setSlices(
        sprite.slices.map((s) =>
          s.id === drag.id
            ? {
                ...s,
                bounds: {
                  ...s.bounds,
                  x: s.bounds.x + drag.dx,
                  y: s.bounds.y + drag.dy,
                },
              }
            : s,
        ),
      );
    }
    if (drag.from.x === drag.to.x && drag.from.y === drag.to.y)
      return onSelectSlice?.(null);
    const slice: Slice = {
      id: crypto.randomUUID(),
      name: nextSliceName(sprite.slices),
      bounds: areaBetween(drag.from, drag.to, size),
      center: null,
      pivot: null,
    };
    sprite.setSlices([...sprite.slices, slice]);
    onSelectSlice?.(slice.id);
  };

  const movePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pixelAt(e);
    const at = wrapPixel(point.x, point.y, size, tiled);
    setHover((h) => (at && h?.x === at.x && h.y === at.y ? h : (at ?? null)));
    if (selectDrag) return moveSelect(point, e.shiftKey);
    if (sliceDrag) return moveSlice(point);
    const current = stroke.current;
    const ctx = sprite.context();
    if (!current || !ctx) return;
    // The spray lays its dots on a timer, around wherever the pointer is.
    if (current.tool === "spray") {
      current.end = point;
      return;
    }
    // An unfinished polygon stretches from its last corner to the pointer.
    if (current.tool === "polygon") {
      const last = current.points.at(-1)!;
      const end = e.shiftKey ? snapLine(last, point) : point;
      if (end.x === current.end.x && end.y === current.end.y) return;
      current.end = end;
      drawStroke(ctx, current);
      return showPolygon(current);
    }
    // A curve bends only while its second or third drag is held.
    if (current.curve && current.curve.stage > 0) {
      if (current.curve.held) bendCurve(current, point);
      return;
    }
    if (
      current.curve ||
      current.tool === "line" ||
      current.tool === "gradient" ||
      current.tool === "rect" ||
      current.tool === "ellipse"
    ) {
      // Lines, gradients and shapes are redrawn from their start; Shift keeps
      // a line to 45° steps and makes a shape a square or circle.
      const from = current.points[0]!;
      const end =
        current.curve || current.tool === "line" || current.tool === "gradient"
          ? e.shiftKey
            ? snapLine(from, point)
            : point
          : squareFrom(from, point, e.shiftKey);
      if (end.x === current.end.x && end.y === current.end.y) return;
      current.end = end;
      // The first drag of a curve draws it straight, its controls on the ends.
      if (current.curve) {
        current.curve.c1 = from;
        current.curve.c2 = end;
        showCurve(current);
      }
    } else {
      const points = extendStroke(current.points, point);
      if (points === current.points) return;
      current.points = points;
    }
    drawStroke(ctx, current);
  };

  const endPointer = () => {
    if (selectDrag) return endSelect();
    if (sliceDrag) return endSlice();
    const current = stroke.current;
    // A polygon stays open between clicks.
    if (!current || current.tool === "polygon") return;
    const curve = current.curve;
    if (curve) {
      curve.held = false;
      const start = current.points[0]!;
      const dot = start.x === current.end.x && start.y === current.end.y;
      // A curve waits for its bending drags; a click without a drag is a dot.
      if (curve.stage < 2 && !(curve.stage === 0 && dot)) {
        curve.stage = curve.stage === 0 ? 1 : 2;
        return showCurve(current);
      }
    }
    finishStroke(current);
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
    if (drag.current) setPending(resizeTo(drag.current, e, scale, stretch));
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
    onDoubleClick: () => {
      if (polygon) closePolygon(polygon);
      if (stroke.current?.tool === "polygon") closeShape(stroke.current);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  const cursor =
    blocked && !selecting
      ? "cursor-not-allowed"
      : tool === "move" || (overSelection && isSelectionTool && !polygon)
        ? "cursor-move"
        : tool === "text"
          ? "cursor-text"
          : "cursor-crosshair";
  const tileStyle = { width: size.w * scale, height: size.h * scale };
  // Wide or tall pixels: the whole stage is shown stretched (see below).
  const stretch = { x: sprite.pixelRatio.w, y: sprite.pixelRatio.h };
  const showTip =
    hover &&
    !pending &&
    !selecting &&
    !frame &&
    !blocked &&
    !isSelectionTool &&
    tool !== "text" &&
    tool !== "slice" &&
    !selectDrag;
  const stampTip = stamp && (tool === "pen" || tool === "brush") ? stamp : null;
  // The corners of a polygonal lasso or of a polygon being drawn.
  const corners = polygon ?? paintPolygon;
  const lasso =
    selectDrag?.kind === "lasso"
      ? selectDrag.points
      : polygon && [...polygon.points, polygon.pointer];
  // The ellipse may run off the tile, so its box isn't clamped to it.
  const marquee =
    selectDrag?.kind === "marquee"
      ? selectDrag.ellipse
        ? boxBetween(selectDrag.from, selectDrag.to)
        : areaBetween(selectDrag.from, selectDrag.to, size)
      : null;
  const ellipseMarquee = selectDrag?.kind === "marquee" && selectDrag.ellipse;

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

      {(outline || marquee || lasso || corners || curveGuide) && (
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
          {marquee && ellipseMarquee && (
            <ellipse
              cx={marquee.x + marquee.w / 2}
              cy={marquee.y + marquee.h / 2}
              rx={marquee.w / 2}
              ry={marquee.h / 2}
              fill="rgb(59 130 246 / 0.12)"
              stroke="rgb(59 130 246)"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {marquee && !ellipseMarquee && (
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
          {/* Once the ends are placed, the bend handles and the lines tying
              them to the ends show where the next drag pulls. */}
          {curveGuide &&
            curveGuide.stage > 0 &&
            [
              { from: curveGuide.start, handle: curveGuide.c1 },
              { from: curveGuide.end, handle: curveGuide.c2 },
            ].map(({ from, handle }, i) => (
              <g key={i}>
                <line
                  x1={from.x + 0.5}
                  y1={from.y + 0.5}
                  x2={handle.x + 0.5}
                  y2={handle.y + 0.5}
                  stroke="rgb(59 130 246)"
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={handle.x + 0.5}
                  cy={handle.y + 0.5}
                  r={0.5}
                  fill="white"
                  stroke="rgb(59 130 246)"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          {corners?.points.map((p, i) => {
            // The first corner fills in when a click on it would close the shape.
            const closes =
              i === 0 &&
              corners.points.length >= 3 &&
              p.x === corners.pointer.x &&
              p.y === corners.pointer.y;
            return (
              <rect
                key={i}
                x={p.x}
                y={p.y}
                width={1}
                height={1}
                fill={closes ? "rgb(59 130 246)" : "white"}
                stroke="rgb(59 130 246)"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
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

      {tool === "slice" && (
        <SliceOverlay
          slices={sprite.slices}
          size={size}
          scale={scale}
          stretch={stretch}
          pickedId={sliceId}
          drag={sliceDrag}
          onResize={(bounds) =>
            sprite.setSlices(
              sprite.slices.map((s) =>
                s.id === sliceId ? resizedSlice(s, bounds) : s,
              ),
            )
          }
        />
      )}

      {openText && textPreview && (
        <canvas
          aria-hidden="true"
          width={textPreview.w}
          height={textPreview.h}
          className="pointer-events-none absolute outline-1 outline-blue-500 outline-dashed [image-rendering:pixelated]"
          style={{
            left: openText.at.x * scale,
            top: openText.at.y * scale,
            width: textPreview.w * scale,
            height: textPreview.h * scale,
          }}
          ref={(canvas) =>
            canvas
              ?.getContext("2d")
              ?.putImageData(
                new ImageData(
                  textPreview.pixels as Uint8ClampedArray<ArrayBuffer>,
                  textPreview.w,
                  textPreview.h,
                ),
                0,
                0,
              )
          }
        />
      )}
      {openText && (
        <input
          ref={textInput}
          aria-label="Text"
          placeholder="Type, then Enter"
          value={openText.text}
          onChange={(e) => {
            setTextBox({ ...openText, text: e.target.value });
            setTextError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void placeText();
            if (e.key === "Escape") {
              setTextBox(null);
              setTextPreview(null);
              setTextError(null);
            }
          }}
          className="absolute z-10 h-7 w-44 rounded-md border bg-background px-2 text-sm text-foreground shadow-md"
          style={{
            left: openText.at.x * scale,
            top: (openText.at.y + (textPreview?.h ?? 0)) * scale + 6,
          }}
        />
      )}
      {openText &&
        (textError ??
          (openText.text.trim() && !textPreview ? NO_GLYPHS : null)) && (
          <p
            role="status"
            className="absolute z-10 w-56 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md"
            style={{
              left: openText.at.x * scale,
              top: (openText.at.y + (textPreview?.h ?? 0)) * scale + 40,
            }}
          >
            {textError ?? NO_GLYPHS}
          </p>
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
          stretch={stretch}
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
  const stage =
    cells.length === 1 ? (
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
    );
  // Pixels that aren't square: everything is laid out with square pixels,
  // then stretched as a whole, so the overlays line up with the pixels and
  // pointer positions (read from the stretched canvas) stay right.
  const columns = new Set(cells.map((c) => c.x)).size;
  const rows = new Set(cells.map((c) => c.y)).size;
  return (
    <>
      {selecting && <SelectionOverlay onCancel={() => finishAiArea(null)} />}
      {stretch.x === 1 && stretch.y === 1 ? (
        stage
      ) : (
        <div
          className={selecting ? "relative z-50" : undefined}
          style={{
            width: columns * size.w * scale * stretch.x,
            height: rows * size.h * scale * stretch.y,
          }}
        >
          <div
            style={{
              width: columns * size.w * scale,
              transform: `scale(${stretch.x}, ${stretch.y})`,
              transformOrigin: "0 0",
            }}
          >
            {stage}
          </div>
        </div>
      )}
    </>
  );
}
