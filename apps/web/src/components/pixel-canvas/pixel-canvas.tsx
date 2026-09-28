"use client";

import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
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
import { paintAt, resizeTo, sameSize } from "./helpers";

/** Lets the page put pixels onto the canvas from outside, e.g. from the AI. */
export type PixelCanvasHandle = {
  size: Size;
  draw: (pixels: Uint8ClampedArray) => void;
};

export function PixelCanvas({ ref }: { ref?: Ref<PixelCanvasHandle> }) {
  const [size, setSize] = useState<Size>(DEFAULT_SIZE);
  const [pending, setPending] = useState<Size | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      size,
      draw(pixels) {
        const ctx = canvasRef.current?.getContext("2d");
        ctx?.putImageData(
          new ImageData(new Uint8ClampedArray(pixels), size.w, size.h),
          0,
          0,
        );
      },
    }),
    [size],
  );
  const drawing = useRef(false);
  const drag = useRef<ResizeDrag>(null);
  // Changing a canvas's size wipes it, so the pixels are carried over here.
  const carried = useRef<ImageData | null>(null);

  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && carried.current) ctx.putImageData(carried.current, 0, 0);
    carried.current = null;
  }, [size]);

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
        className="block size-full touch-none cursor-crosshair [image-rendering:pixelated]"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          paintAt(e);
        }}
        onPointerMove={(e) => {
          if (drawing.current) paintAt(e);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onContextMenu={(e) => e.preventDefault()}
      />

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
