"use client";

import { useEffect, useRef, useState } from "react";
import type { SpriteApi } from "../../pixel-canvas/use-sprite";
import { frameIndex } from "@/lib/sprite/frames";

const SIZES: { value: number; label: string; hint: string }[] = [
  { value: 0, label: "Fit", hint: "As big as the window allows" },
  { value: 1, label: "1×", hint: "Real size, smaller if it doesn’t fit" },
  { value: 2, label: "2×", hint: "Twice the size, smaller if it doesn’t fit" },
];

const MIN = { w: 160, h: 120 };
const MARGIN = 8;
const HEADER = 32;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Math.max(min, max));

export function PreviewWindow({
  sprite,
  onClose,
}: {
  sprite: SpriteApi;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState(() => ({
    x: Math.max(MARGIN, window.innerWidth - 260 - 24),
    y: 120,
    w: 260,
    h: 240,
  }));
  const [zoom, setZoom] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const { size, frames, pixelRatio } = sprite;
  const canPlay = frames.length > 1;
  const shown =
    playing && canPlay
      ? frames[step % frames.length]!
      : frames[Math.max(0, frameIndex(frames, sprite.frameId))]!;

  const art = { w: size.w * pixelRatio.w, h: size.h * pixelRatio.h };
  const room = { w: box.w - 2 * MARGIN, h: box.h - HEADER - 2 * MARGIN };
  const fit = Math.min(room.w / art.w, room.h / art.h);
  const best = fit >= 1 ? Math.floor(fit) : fit;
  const scale = zoom ? Math.min(zoom, fit) : best;

  useEffect(() => {
    if (!playing || !canPlay) return;
    const timer = setTimeout(() => setStep((s) => s + 1), shown.duration);
    return () => clearTimeout(timer);
  }, [playing, canPlay, shown]);

  useEffect(() => {
    canvas.current
      ?.getContext("2d")
      ?.putImageData(
        new ImageData(
          new Uint8ClampedArray(sprite.composite(["reference"], shown.id)),
          size.w,
          size.h,
        ),
        0,
        0,
      );
  });

  useEffect(() => {
    const keepInside = () =>
      setBox((b) => ({
        ...b,
        x: clamp(b.x, 0, window.innerWidth - b.w),
        y: clamp(b.y, 0, window.innerHeight - b.h),
      }));
    window.addEventListener("resize", keepInside);
    return () => window.removeEventListener("resize", keepInside);
  }, []);

  const drag = (
    e: React.PointerEvent<HTMLElement>,
    change: (dx: number, dy: number, from: typeof box) => typeof box,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = { x: e.clientX, y: e.clientY, box };
    el.setPointerCapture(e.pointerId);
    const move = (event: PointerEvent) =>
      setBox(
        change(event.clientX - start.x, event.clientY - start.y, start.box),
      );
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };

  return (
    <section
      aria-label="Preview"
      className="fixed z-50 flex flex-col overflow-hidden rounded-lg border bg-background shadow-2xl"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    >
      <header
        onPointerDown={(e) => {
          if ((e.target as Element).closest("button")) return;
          drag(e, (dx, dy, from) => ({
            ...from,
            x: clamp(from.x + dx, 0, window.innerWidth - from.w),
            y: clamp(from.y + dy, 0, window.innerHeight - from.h),
          }));
        }}
        title="Drag to move"
        className="flex h-8 shrink-0 cursor-move touch-none items-center gap-1 border-b px-2 select-none"
      >
        <span className="mr-auto text-[11px] font-semibold tracking-wider text-foreground/80 uppercase">
          Preview
        </span>
        <div
          role="radiogroup"
          aria-label="Preview size"
          className="flex rounded-md border p-0.5"
        >
          {SIZES.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={zoom === value}
              title={hint}
              onClick={() => setZoom(value)}
              className="rounded px-1.5 text-[11px] tabular-nums aria-checked:bg-muted aria-checked:font-semibold"
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={playing}
          disabled={!canPlay}
          title={
            canPlay
              ? playing
                ? "Stop the animation"
                : "Play the animation here while you draw"
              : "Add frames to play an animation"
          }
          onClick={() => {
            setStep(Math.max(0, frameIndex(frames, sprite.frameId)));
            setPlaying((p) => !p);
          }}
          className="h-5 rounded-md border px-1.5 text-[11px] hover:bg-muted disabled:opacity-40 aria-pressed:bg-muted aria-pressed:font-semibold"
        >
          {playing ? "Stop" : "Play"}
        </button>
        <button
          type="button"
          aria-label="Close the preview"
          title="Close (F7)"
          onClick={onClose}
          className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ×
        </button>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted p-2">
        <canvas
          ref={canvas}
          width={size.w}
          height={size.h}
          aria-label="The tile, scaled to fit"
          className="block shrink-0 bg-checker [image-rendering:pixelated]"
          style={{ width: art.w * scale, height: art.h * scale }}
        />
      </div>
      <span
        aria-hidden="true"
        title="Drag to resize"
        onPointerDown={(e) =>
          drag(e, (dx, dy, from) => ({
            ...from,
            w: clamp(from.w + dx, MIN.w, window.innerWidth - from.x),
            h: clamp(from.h + dy, MIN.h, window.innerHeight - from.y),
          }))
        }
        className="absolute right-0 bottom-0 size-3 cursor-nwse-resize touch-none bg-[linear-gradient(135deg,transparent_50%,var(--color-border)_50%)]"
      />
    </section>
  );
}
