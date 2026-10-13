"use client";

import { useState, type PointerEvent } from "react";
import { hexToHsv, hsvToHex, opaqueHex, type Hsv } from "@/lib/palette/hsv";

const HUES =
  "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";

const THUMB =
  "pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(74,36,52,0.5)]";

function drag(
  e: PointerEvent<HTMLElement>,
  apply: (fx: number, fy: number) => void,
) {
  if (e.button !== 0) return;
  e.preventDefault();
  const el = e.currentTarget;
  el.setPointerCapture(e.pointerId);
  const at = (x: number, y: number) => {
    const r = el.getBoundingClientRect();
    apply(
      Math.min(1, Math.max(0, (x - r.left) / r.width)),
      Math.min(1, Math.max(0, (y - r.top) / r.height)),
    );
  };
  at(e.clientX, e.clientY);
  const move = (event: globalThis.PointerEvent) =>
    at(event.clientX, event.clientY);
  const end = () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", end);
    el.removeEventListener("pointercancel", end);
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

export function MiniColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(color));
  const [shown, setShown] = useState(opaqueHex(color));
  if (opaqueHex(color) !== shown) {
    setShown(opaqueHex(color));
    const next = hexToHsv(color);
    setHsv(next.s && next.v ? next : { ...next, h: hsv.h });
  }

  const change = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setShown(hex);
    onChange(hex);
  };

  return (
    <div className="grid gap-2.5 select-none">
      <div
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuenow={Math.round(hsv.v * 100)}
        tabIndex={0}
        onPointerDown={(e) =>
          drag(e, (fx, fy) => change({ ...hsv, s: fx, v: 1 - fy }))
        }
        className="relative h-28 w-full cursor-crosshair touch-none rounded-xl border"
        style={{
          backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
        }}
      >
        <span
          aria-hidden="true"
          className={THUMB}
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: shown,
          }}
        />
      </div>
      <div
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        onPointerDown={(e) => drag(e, (fx) => change({ ...hsv, h: fx * 360 }))}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full"
        style={{ backgroundImage: HUES }}
      >
        <span
          aria-hidden="true"
          className={`${THUMB} top-1/2`}
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            backgroundColor: `hsl(${hsv.h} 100% 50%)`,
          }}
        />
      </div>
    </div>
  );
}
