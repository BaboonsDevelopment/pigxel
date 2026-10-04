"use client";

import { useRef, type PointerEvent } from "react";
import type { Size } from "../constants";
import type { Axes, Symmetry } from "../paint";

const VERTICAL: Symmetry[] = ["horizontal", "both", "all"];
const HORIZONTAL: Symmetry[] = ["vertical", "both", "all"];
const DOWN: Symmetry[] = ["diagonal", "all"];
const UP: Symmetry[] = ["antiDiagonal", "all"];

const LINE = {
  stroke: "#d946ef",
  strokeWidth: 1,
  strokeDasharray: "4 3",
  vectorEffect: "non-scaling-stroke",
} as const;

export function SymmetryAxes({
  symmetry,
  axes,
  size,
  scale,
  onChange,
}: {
  symmetry: Symmetry;
  axes: Axes;
  size: Size;
  scale: number;
  onChange?: (axes: Axes | null) => void;
}) {
  const area = useRef<HTMLDivElement>(null);
  const cx = axes.x + 0.5;
  const cy = axes.y + 0.5;
  const reach = size.w + size.h;

  const drag = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !onChange) return;
    e.preventDefault();
    e.stopPropagation();
    const knob = e.currentTarget;
    knob.setPointerCapture(e.pointerId);
    const move = (event: globalThis.PointerEvent) => {
      const r = area.current!.getBoundingClientRect();
      const snap = (v: number, max: number) =>
        Math.min(max - 1, Math.max(0, Math.round(v * 2) / 2));
      onChange({
        x: snap(((event.clientX - r.left) / r.width) * size.w - 0.5, size.w),
        y: snap(((event.clientY - r.top) / r.height) * size.h - 0.5, size.h),
      });
    };
    const end = () => {
      knob.removeEventListener("pointermove", move);
      knob.removeEventListener("pointerup", end);
      knob.removeEventListener("pointercancel", end);
    };
    knob.addEventListener("pointermove", move);
    knob.addEventListener("pointerup", end);
    knob.addEventListener("pointercancel", end);
  };

  return (
    <div
      ref={area}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
    >
      <svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-hidden"
      >
        {VERTICAL.includes(symmetry) && (
          <line {...LINE} x1={cx} y1={0} x2={cx} y2={size.h} />
        )}
        {HORIZONTAL.includes(symmetry) && (
          <line {...LINE} x1={0} y1={cy} x2={size.w} y2={cy} />
        )}
        {DOWN.includes(symmetry) && (
          <line
            {...LINE}
            x1={cx - reach}
            y1={cy - reach}
            x2={cx + reach}
            y2={cy + reach}
          />
        )}
        {UP.includes(symmetry) && (
          <line
            {...LINE}
            x1={cx - reach}
            y1={cy + reach}
            x2={cx + reach}
            y2={cy - reach}
          />
        )}
      </svg>
      {onChange && (
        <button
          type="button"
          title="Drag to move the mirror · Double-click puts it back in the middle"
          onPointerDown={drag}
          onDoubleClick={() => onChange(null)}
          className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 border-white bg-fuchsia-500 shadow"
          style={{ left: cx * scale, top: cy * scale }}
        />
      )}
    </div>
  );
}
