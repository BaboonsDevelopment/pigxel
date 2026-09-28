"use client";

import { useRef } from "react";
import {
  FRAME_HANDLES,
  MOVE_FRAME,
  type Area,
  type FrameEdges,
  type Size,
} from "../constants";
import { adjustFrame } from "../helpers";

type Props = {
  frame: Area;
  tile: Size;
  scale: number;
  onChange: (frame: Area) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The frame where a new picture will go: drag inside to move it, drag a
 * handle to resize it, then confirm. Enter and Esc work too (see the canvas).
 */
export function FrameEditor({
  frame,
  tile,
  scale,
  onChange,
  onConfirm,
  onCancel,
}: Props) {
  const drag = useRef<{ edges: FrameEdges; x: number; y: number; start: Area }>(
    null,
  );

  // Which part is dragged comes from `data-side`: a handle, or the body.
  const start = (e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const side = e.currentTarget.dataset.side;
    const edges =
      FRAME_HANDLES.find((h) => h.side === side)?.edges ?? MOVE_FRAME;
    drag.current = { edges, x: e.clientX, y: e.clientY, start: frame };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = Math.round((e.clientX - d.x) / scale);
    const dy = Math.round((e.clientY - d.y) / scale);
    onChange(adjustFrame(d.start, d.edges, dx, dy, tile));
  };

  const end = () => {
    drag.current = null;
  };

  return (
    <div
      className="absolute cursor-move touch-none border-2 border-amber-400 bg-amber-400/20"
      style={{
        left: frame.x * scale,
        top: frame.y * scale,
        width: frame.w * scale,
        height: frame.h * scale,
      }}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {FRAME_HANDLES.map(({ side, className }) => (
        <div
          key={side}
          data-side={side}
          className={`absolute rounded-sm border border-amber-600 bg-white ${className}`}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      ))}

      <div
        className="absolute top-full left-0 mt-2 flex items-center gap-2 whitespace-nowrap"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Generate here
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border bg-background px-3 py-1 text-xs shadow hover:bg-muted"
        >
          Cancel
        </button>
        <span className="rounded bg-amber-400 px-2 py-0.5 text-xs text-black tabular-nums">
          {frame.w} × {frame.h}
        </span>
      </div>
    </div>
  );
}
