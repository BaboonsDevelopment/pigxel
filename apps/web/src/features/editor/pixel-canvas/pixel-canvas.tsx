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
import { frameIndex } from "@/lib/sprite/frames";
import { tipRects } from "../tools/shared/tips";
import type { Tool, ToolHandlers } from "../tools";
import { SymmetryAxes } from "./components/symmetry-axes";
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
  pixelsPassed,
  resizeTo,
  sameSize,
  tileSnapshot,
} from "./helpers";
import {
  centreAxes,
  mirrored,
  wrapPixel,
  type Axes,
  type PaintOptions,
  type Stamp,
  type TiledMode,
} from "./paint";
import {
  brushOrigin,
  pixelColor,
  type ColorSlot,
  type PenSettings,
  type Point,
} from "./pen";
import { isSelected, maskOutline } from "./selection";
import type { SelectionApi } from "./use-selection";
import type { SpriteApi } from "./use-sprite";
import { onionFrames, type CanvasView } from "./view";

export type PixelCanvasHandle = {
  readTile: (area: Area) => Uint8ClampedArray;
  isEmpty: () => boolean;
  freeArea: () => Area | null;
  snapshot: (area?: Area, background?: string) => string;
  selectArea: () => Promise<Area | null>;
  adjustArea: (area: Area) => Promise<Area | null>;
  tileRect: () => DOMRect | null;
  tilePointAt: (clientX: number, clientY: number) => Point | null;
};

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
  onAxesChange,
  ref,
}: {
  tool: Tool;
  pen: PenSettings;
  scale: number;
  sprite: SpriteApi;
  selection: SelectionApi;
  view: CanvasView;
  stamp: Stamp | null;
  highlight?: Area | null;
  onPickColor?: (color: string, slot: ColorSlot) => void;
  onUseColor?: (color: string) => void;
  onTextPlaced?: () => void;
  sliceId?: string | null;
  onSelectSlice?: (id: string | null) => void;
  onAxesChange?: (axes: Axes | null) => void;
  ref?: Ref<PixelCanvasHandle>;
}) {
  const { size } = sprite;
  const { symmetry, tiled } = view;
  const axes = view.axes ?? centreAxes(sprite.size);
  const [pending, setPending] = useState<Size | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [aiArea, setAiArea] = useState<Area | null>(null);
  const [toolPending, setToolPending] = useState(false);
  const screenRef = useRef<HTMLCanvasElement>(null);
  const onionRef = useRef<HTMLCanvasElement>(null);
  const copies = useRef(new Set<HTMLCanvasElement>());
  const handlers = useRef<ToolHandlers>(null);
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
    axes,
    tiled,
    mask,
    density: pen.density,
  };

  const paintCopy = (copy: HTMLCanvasElement) => {
    const ctx = copy.getContext("2d");
    if (!ctx || !screenRef.current) return;
    ctx.clearRect(0, 0, copy.width, copy.height);
    ctx.drawImage(screenRef.current, 0, 0);
  };

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
    for (const { index, before, strength } of around.reverse()) {
      const pixels = sprite.previewComposite(
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

  const paintScreen = useEffectEvent(() => {
    screenRef.current
      ?.getContext("2d")
      ?.putImageData(
        new ImageData(
          sprite.previewComposite() as Uint8ClampedArray<ArrayBuffer>,
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
      sprite.soloId,
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
      tileRect: () => screenRef.current?.getBoundingClientRect() ?? null,
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

  const pointerTip = tool.tip?.(pen) ?? null;
  const hoverSize = pointerTip?.size ?? 1;
  const hoverTip = tipRects(pointerTip, pen.brushAngle);
  const hoverOutline = !!pointerTip?.outline;
  const blocked = !sprite.canPaint && !tool.anyLayer;
  const overSelection = !!hover && isSelected(mask, size, hover);

  const pickColor = (point: Point, slot: ColorSlot) => {
    const at = wrapPixel(point.x, point.y, size, tiled);
    const pixel =
      at && screenRef.current?.getContext("2d")?.getImageData(at.x, at.y, 1, 1);
    const color = pixel && pixelColor(pixel, { x: 0, y: 0 });
    if (color) onPickColor?.(color, slot);
  };

  const startPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (frame || (e.button !== 0 && e.button !== 2)) return;
    const point = pixelAt(e);
    const active = handlers.current;
    if (active?.pending?.()) return active.down?.(e, point);
    if (e.altKey && !tool.selects)
      return pickColor(point, e.button === 2 ? "secondary" : "primary");
    if (blocked) return;
    active?.down?.(e, point);
  };

  const movePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const passed = pixelsPassed(e.nativeEvent, e.currentTarget);
    const point = passed.at(-1);
    if (!point) return;
    const at = wrapPixel(point.x, point.y, size, tiled);
    setHover((h) => (at && h?.x === at.x && h.y === at.y ? h : (at ?? null)));
    const active = handlers.current;
    setToolPending(active?.pending?.() ?? false);
    active?.move?.(e, passed);
  };

  const endPointer = () => handlers.current?.up?.();

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
    onDoubleClick: () => handlers.current?.doubleClick?.(),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  const cursor =
    blocked && !selecting
      ? "cursor-not-allowed"
      : tool.cursor === "move" ||
          (tool.cursor === "selection" && overSelection && !toolPending)
        ? "cursor-move"
        : tool.cursor === "text"
          ? "cursor-text"
          : "cursor-crosshair";
  const ToolCanvas = tool.canvas;
  const tileStyle = { width: size.w * scale, height: size.h * scale };
  const stretch = { x: sprite.pixelRatio.w, y: sprite.pixelRatio.h };
  const showTip =
    hover && pointerTip && !pending && !selecting && !frame && !blocked;
  const stampTip = stamp && tool.stamp ? stamp : null;
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
          {mirrored(hover, size, symmetry, axes).flatMap((at, copy) =>
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

      {symmetry !== "none" && (
        <SymmetryAxes
          symmetry={symmetry}
          axes={axes}
          size={size}
          scale={scale}
          onChange={onAxesChange}
        />
      )}

      {outline && (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
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
        </svg>
      )}

      <ToolCanvas
        key={tool.id}
        ref={handlers}
        tool={tool}
        pen={pen}
        sprite={sprite}
        selection={selection}
        stamp={stamp}
        scale={scale}
        stretch={stretch}
        snap={view.snap ? view.gridSize : 0}
        paintOptions={paintOptions}
        paused={selecting || !!frame}
        lastPointRef={lastPoint}
        pickColor={pickColor}
        onUseColor={onUseColor}
        onTextPlaced={onTextPlaced}
        sliceId={sliceId}
        onSelectSlice={onSelectSlice}
      />

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
