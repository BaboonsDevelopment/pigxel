"use client";

import { useRef } from "react";
import type { FreeTransform } from "@/components/pixel-canvas/free-transform";

type Box = { t: FreeTransform; w: number; h: number };

const HANDLES = [-1, 0, 1]
  .flatMap((y) => [-1, 0, 1].map((x) => ({ x, y })))
  .filter((h) => h.x !== 0 || h.y !== 0);

const ANGLE_STEP = 15;

type Drag =
  | { kind: "scale"; hx: number; hy: number; start: Box }
  | { kind: "rotate"; start: Box; from: number };

export function TransformHandles({
  box,
  scale,
  size,
  begin,
  onChange,
}: {
  box: Box;
  scale: number;
  size: { w: number; h: number };
  begin: () => Box | null;
  onChange: (t: FreeTransform) => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const { t, w, h } = box;
  const width = Math.abs(w * t.scaleX) * scale;
  const height = Math.abs(h * t.scaleY) * scale;

  const tileAt = (e: React.PointerEvent) => {
    const rect = area.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * size.w,
      y: ((e.clientY - rect.top) / rect.height) * size.h,
    };
  };

  const start = (e: React.PointerEvent, make: (b: Box) => Drag) => {
    e.preventDefault();
    e.stopPropagation();
    const from = begin();
    if (!from) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = make(from);
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const p = tileAt(e);
    const s = d.start;
    const t0 = s.t;
    if (d.kind === "rotate") {
      const now = (Math.atan2(p.y - t0.cy, p.x - t0.cx) * 180) / Math.PI;
      let angle = t0.angle + now - d.from;
      if (e.shiftKey) angle = Math.round(angle / ANGLE_STEP) * ANGLE_STEP;
      angle = ((((angle + 180) % 360) + 360) % 360) - 180;
      return onChange({ ...t0, angle: Math.round(angle * 10) / 10 });
    }
    const r = (-t0.angle * Math.PI) / 180;
    const dx = p.x - t0.cx;
    const dy = p.y - t0.cy;
    const ly = Math.sin(r) * dx + Math.cos(r) * dy;
    const lx =
      Math.cos(r) * dx -
      Math.sin(r) * dy -
      Math.tan((t0.skew * Math.PI) / 180) * ly;
    const w0 = s.w * t0.scaleX;
    const h0 = s.h * t0.scaleY;
    let nw = d.hx ? Math.max(1, d.hx * lx + w0 / 2) : w0;
    let nh = d.hy ? Math.max(1, d.hy * ly + h0 / 2) : h0;
    if (e.shiftKey && d.hx && d.hy) {
      const k = Math.max(nw / w0, nh / h0);
      nw = w0 * k;
      nh = h0 * k;
    }
    const gx = (d.hx * (nw - w0)) / 2;
    const gy = (d.hy * (nh - h0)) / 2;
    const a = (t0.angle * Math.PI) / 180;
    const k = Math.tan((t0.skew * Math.PI) / 180);
    const sx = gx + k * gy;
    onChange({
      ...t0,
      scaleX: nw / s.w,
      scaleY: nh / s.h,
      cx: t0.cx + Math.cos(a) * sx - Math.sin(a) * gy,
      cy: t0.cy + Math.sin(a) * sx + Math.cos(a) * gy,
    });
  };

  const end = (e: React.PointerEvent) => {
    if (drag.current) e.stopPropagation();
    drag.current = null;
  };

  const handlers = {
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
  };

  return (
    <div
      ref={area}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20"
    >
      <div
        className="absolute outline-1 outline-blue-500 outline-dashed"
        style={{
          left: t.cx * scale,
          top: t.cy * scale,
          width,
          height,
          transform: `translate(-50%, -50%) rotate(${t.angle}deg) skewX(${t.skew}deg)`,
        }}
      >
        <div className="absolute bottom-full left-1/2 h-5 w-px -translate-x-1/2 bg-blue-500" />
        <div
          title="Drag to rotate · Shift snaps to 15°"
          className="pointer-events-auto absolute bottom-full left-1/2 mb-5 size-3 -translate-x-1/2 translate-y-1/2 cursor-grab rounded-full border-2 border-blue-500 bg-white"
          onPointerDown={(e) =>
            start(e, (b) => {
              const p = tileAt(e);
              return {
                kind: "rotate",
                start: b,
                from: (Math.atan2(p.y - b.t.cy, p.x - b.t.cx) * 180) / Math.PI,
              };
            })
          }
          {...handlers}
        />
        {HANDLES.map(({ x, y }) => (
          <div
            key={`${x},${y}`}
            title={
              x && y
                ? "Drag to scale · Shift keeps the shape"
                : "Drag to stretch"
            }
            className="pointer-events-auto absolute size-2.5 -translate-x-1/2 -translate-y-1/2 border border-blue-500 bg-white"
            style={{
              left: `${(x + 1) * 50}%`,
              top: `${(y + 1) * 50}%`,
              cursor: handleCursor(x, y, t.angle),
            }}
            onPointerDown={(e) =>
              start(e, (b) => ({ kind: "scale", hx: x, hy: y, start: b }))
            }
            {...handlers}
          />
        ))}
      </div>
    </div>
  );
}

function handleCursor(x: number, y: number, angle: number) {
  const CURSORS = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"];
  const deg = (Math.atan2(y, x) * 180) / Math.PI + angle;
  const step = Math.round((((deg % 180) + 180) % 180) / 45) % 4;
  return CURSORS[step];
}
