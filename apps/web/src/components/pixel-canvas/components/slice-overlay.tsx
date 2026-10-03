"use client";

import { useRef, useState } from "react";
import { resizedSlice, type Rect, type Slice } from "@/lib/slices/slices";
import { FRAME_HANDLES, type FrameEdges, type Size } from "../constants";
import { adjustFrame, areaBetween } from "../helpers";
import type { Point } from "../pen";

type SliceDrag =
  | { kind: "new"; from: Point; to: Point }
  | { kind: "move"; id: string; from: Point; dx: number; dy: number }
  | null;

/**
 * The tile's slices over the canvas, as the Slice tool shows them: each
 * outlined with its name, the picked one with its 9-slice centre and pivot,
 * and the one being drawn, moved or resized where the pointer has it. The
 * picked slice has handles on its corners and sides to resize it by.
 */
export function SliceOverlay({
  slices,
  size,
  scale,
  stretch = { x: 1, y: 1 },
  pickedId,
  drag,
  onResize,
}: {
  slices: Slice[];
  size: Size;
  scale: number;
  /** How much wider or taller pixels are shown (the pixel ratio); 1 for square. */
  stretch?: { x: number; y: number };
  pickedId: string | null;
  drag: SliceDrag;
  /** Called with the picked slice's new bounds when a handle is let go. */
  onResize: (bounds: Rect) => void;
}) {
  const [resizing, setResizing] = useState<Rect | null>(null);
  const handle = useRef<{
    edges: FrameEdges;
    x: number;
    y: number;
    start: Rect;
    /** Where the handle has the slice now. */
    bounds: Rect;
  }>(null);
  // Each slice as it shows now: moved or resized while being dragged.
  const shown = (slice: Slice): Slice => {
    if (slice.id === pickedId && resizing) return resizedSlice(slice, resizing);
    if (drag?.kind === "move" && drag.id === slice.id)
      return {
        ...slice,
        bounds: {
          ...slice.bounds,
          x: slice.bounds.x + drag.dx,
          y: slice.bounds.y + drag.dy,
        },
      };
    return slice;
  };
  const boundsOf = (slice: Slice): Rect => shown(slice).bounds;
  const picked = slices.find((s) => s.id === pickedId);
  const pickedBounds = picked && !drag ? boundsOf(picked) : null;

  // Handles drag their edges by whole tile pixels, keeping the slice on the
  // tile and at least a pixel big.
  const startResize = (
    e: React.PointerEvent<HTMLElement>,
    edges: FrameEdges,
  ) => {
    if (!picked) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    handle.current = {
      edges,
      x: e.clientX,
      y: e.clientY,
      start: picked.bounds,
      bounds: picked.bounds,
    };
    setResizing(picked.bounds);
  };
  const moveResize = (e: React.PointerEvent) => {
    const h = handle.current;
    if (!h) return;
    const dx = Math.round((e.clientX - h.x) / (scale * stretch.x));
    const dy = Math.round((e.clientY - h.y) / (scale * stretch.y));
    h.bounds = adjustFrame(h.start, h.edges, dx, dy, size, 1);
    setResizing(h.bounds);
  };
  const endResize = () => {
    const h = handle.current;
    handle.current = null;
    setResizing(null);
    const b = h?.bounds;
    if (
      h &&
      b &&
      (b.x !== h.start.x ||
        b.y !== h.start.y ||
        b.w !== h.start.w ||
        b.h !== h.start.h)
    )
      onResize(b);
  };
  const drawing =
    drag?.kind === "new" ? areaBetween(drag.from, drag.to, size) : null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
      >
        {slices.map((original) => {
          const slice = shown(original);
          const b = slice.bounds;
          const picked = slice.id === pickedId;
          return (
            <g key={slice.id}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={picked ? "rgb(59 130 246 / 0.12)" : "none"}
                stroke="rgb(59 130 246)"
                strokeWidth={picked ? 2 : 1}
                strokeDasharray={picked ? undefined : "4 3"}
                vectorEffect="non-scaling-stroke"
              />
              {picked && slice.center && (
                <rect
                  x={b.x + slice.center.x}
                  y={b.y + slice.center.y}
                  width={slice.center.w}
                  height={slice.center.h}
                  fill="none"
                  stroke="rgb(59 130 246)"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {picked && slice.pivot && (
                <circle
                  cx={b.x + slice.pivot.x + 0.5}
                  cy={b.y + slice.pivot.y + 0.5}
                  r={0.35}
                  fill="white"
                  stroke="rgb(59 130 246)"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          );
        })}
        {drawing && (
          <rect
            x={drawing.x}
            y={drawing.y}
            width={drawing.w}
            height={drawing.h}
            fill="rgb(59 130 246 / 0.12)"
            stroke="rgb(59 130 246)"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {slices.map((slice) => {
        const b = boundsOf(slice);
        return (
          <span
            key={slice.id}
            className={`absolute max-w-40 truncate rounded px-1.5 py-0.5 text-[11px] leading-none whitespace-nowrap ${
              slice.id === pickedId
                ? "bg-blue-500 text-white"
                : "bg-background/90 text-blue-600"
            }`}
            style={{ left: b.x * scale, top: b.y * scale - 18 }}
          >
            {slice.name}
          </span>
        );
      })}
      {pickedBounds && (
        <div
          className="absolute"
          style={{
            left: pickedBounds.x * scale,
            top: pickedBounds.y * scale,
            width: pickedBounds.w * scale,
            height: pickedBounds.h * scale,
          }}
        >
          {FRAME_HANDLES.map(({ side, edges, className }) => (
            <div
              key={side}
              title="Drag to resize the slice"
              className={`pointer-events-auto absolute touch-none rounded-sm border border-blue-600 bg-white ${className}`}
              onPointerDown={(e) => startResize(e, edges)}
              onPointerMove={moveResize}
              onPointerUp={endResize}
              onPointerCancel={endResize}
            />
          ))}
          {resizing && (
            <span className="absolute top-full left-full mt-1 rounded bg-blue-500 px-2 py-0.5 text-xs whitespace-nowrap text-white tabular-nums">
              {resizing.w} × {resizing.h}
            </span>
          )}
        </div>
      )}
      {drawing && (
        <span
          className="absolute rounded bg-blue-500 px-2 py-0.5 text-xs whitespace-nowrap text-white tabular-nums"
          style={{
            left: (drawing.x + drawing.w) * scale,
            top: (drawing.y + drawing.h) * scale + 4,
          }}
        >
          {drawing.w} × {drawing.h}
        </span>
      )}
    </div>
  );
}
