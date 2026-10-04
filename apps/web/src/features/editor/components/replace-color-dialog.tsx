"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import { FormMessage } from "@pigxel/ui/components/field";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { replacedColor } from "../pixel-canvas/effects";
import { rgbaOf } from "../pixel-canvas/paint";
import { cn } from "@pigxel/ui/lib/utils";
import { withAlpha } from "@/lib/palette/hsv";
import { colorsOf } from "@/lib/palette/presets";
import { ColorPicker } from "./colors/color-picker";
import { swatchStyle } from "./colors/helpers";

type Size = { w: number; h: number };

export type ReplaceChoice = {
  from: string;
  to: string;
  tolerance: number;
  keepShading: boolean;
};

const PREVIEW = { w: 320, h: 140 };
const MAX_ZOOM = 32;

export default function ReplaceColorDialog({
  size,
  pixels,
  mask,
  palette,
  from: initialFrom,
  to: initialTo,
  onApply,
  onClose,
}: {
  size: Size;
  pixels: Uint8ClampedArray;
  mask: Uint8Array | null;
  palette: string[];
  from: string;
  to: string;
  onApply: (choice: ReplaceChoice) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [tolerance, setTolerance] = useState(0);
  const [keepShading, setKeepShading] = useState(false);
  useEffect(() => dialog.current?.showModal(), []);

  const result = useMemo(
    () =>
      replacedColor(
        pixels,
        rgbaOf(from),
        rgbaOf(to),
        mask,
        tolerance,
        keepShading,
      ),
    [pixels, from, to, mask, tolerance, keepShading],
  );
  const changed = useMemo(() => {
    let n = 0;
    for (let i = 0; i < result.length; i += 4)
      if (
        result[i] !== pixels[i] ||
        result[i + 1] !== pixels[i + 1] ||
        result[i + 2] !== pixels[i + 2] ||
        result[i + 3] !== pixels[i + 3]
      )
        n++;
    return n;
  }, [result, pixels]);
  const layerColors = useMemo(() => colorsOf(pixels, 48), [pixels]);
  const pickAt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * size.w);
    const y = Math.floor(((e.clientY - r.top) / r.height) * size.h);
    if (x < 0 || y < 0 || x >= size.w || y >= size.h) return null;
    const i = (y * size.w + x) * 4;
    if (!pixels[i + 3]) return null;
    return withAlpha(
      `#${[0, 1, 2].map((c) => pixels[i + c]!.toString(16).padStart(2, "0")).join("")}`,
      pixels[i + 3]!,
    );
  };
  const swatch = (color: string) => (
    <button
      key={color}
      type="button"
      aria-label={color}
      title={`${color} · click: replace this, right-click: with this`}
      onClick={() => setFrom(color)}
      onContextMenu={(e) => {
        e.preventDefault();
        setTo(color);
      }}
      className={cn(
        "size-5 rounded-[2px] ring-1 ring-black/10",
        color === from && "ring-2 ring-foreground",
      )}
      style={swatchStyle(color)}
    />
  );
  const fit = Math.min(PREVIEW.w / size.w, PREVIEW.h / size.h);
  const fitted = fit >= 1 ? Math.floor(fit) : fit;
  const [zoom, setZoom] = useState(fitted);
  const zoomBy = (step: number) =>
    setZoom((z) =>
      Math.min(
        MAX_ZOOM,
        Math.max(fitted, step > 0 ? Math.floor(z) + 1 : Math.ceil(z) - 1),
      ),
    );
  const frame = useRef<HTMLDivElement>(null);
  const panned = useRef(false);
  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 1 && e.button !== 2) return;
    const el = e.currentTarget;
    const from = {
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    panned.current = false;
    el.setPointerCapture(e.pointerId);
    const move = (event: globalThis.PointerEvent) => {
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (!panned.current && Math.hypot(dx, dy) < 4) return;
      panned.current = true;
      el.scrollLeft = from.left - dx;
      el.scrollTop = from.top - dy;
    };
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  useEffect(() => {
    const ctx = preview.current?.getContext("2d");
    if (!ctx) return;
    const source = document.createElement("canvas");
    source.width = size.w;
    source.height = size.h;
    source
      .getContext("2d")
      ?.putImageData(
        new ImageData(new Uint8ClampedArray(result), size.w, size.h),
        0,
        0,
      );
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(source, 0, 0, size.w * zoom, size.h * zoom);
  }, [result, size, zoom]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="replace-color-title"
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="replace-color-title">Replace colour</SectionTitle>
          <Lead className="mt-1">
            {mask ? "In the selection" : "On the whole layer"}, in this frame.
          </Lead>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => dialog.current?.close()}
          className="text-lg leading-none"
        >
          ×
        </Button>
      </div>

      <form
        className="max-h-[80dvh] space-y-5 overflow-y-auto p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!changed) return;
          onApply({ from, to, tolerance, keepShading });
          dialog.current?.close();
        }}
      >
        <div className="relative">
          <div
            ref={frame}
            onPointerDown={startPan}
            onMouseDown={(e) => {
              if (e.button === 1) e.preventDefault();
            }}
            onContextMenu={(e) => {
              if (panned.current) e.preventDefault();
            }}
            className="flex max-h-80 min-h-20 overflow-auto rounded-lg border bg-muted p-3"
          >
            <div className="m-auto shrink-0 bg-checker">
              <canvas
                ref={preview}
                width={Math.ceil(size.w * zoom)}
                height={Math.ceil(size.h * zoom)}
                aria-label="The layer with the colour replaced"
                title="Click a pixel to replace its colour, right-click to replace with it"
                onClick={(e) => {
                  const color = pickAt(e);
                  if (color) setFrom(color);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (panned.current) return;
                  const color = pickAt(e);
                  if (color) setTo(color);
                }}
                className="block cursor-crosshair"
              />
            </div>
          </div>
          <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md border bg-background/90 p-0.5 text-xs shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Zoom out"
              onClick={() => zoomBy(-1)}
              className="size-6"
            >
              −
            </Button>
            <button
              type="button"
              title="Fit"
              onClick={() => setZoom(fitted)}
              className="min-w-10 tabular-nums"
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Zoom in"
              onClick={() => zoomBy(1)}
              className="size-6"
            >
              +
            </Button>
          </div>
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">
          Click the picture or a colour below to pick what to replace;
          right-click to pick what to replace it with.
        </p>

        {layerColors.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">On this layer</p>
            <div className="flex flex-wrap gap-1">
              {layerColors.map(swatch)}
            </div>
          </div>
        )}
        {palette.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Palette</p>
            <div className="flex flex-wrap gap-1">{palette.map(swatch)}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Replace</p>
            <ColorPicker color={from} onChange={setFrom} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">With</p>
            <ColorPicker color={to} onChange={setTo} />
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <span className="font-medium">Tolerance</span>
          <input
            type="range"
            min={0}
            max={255}
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="min-w-0 flex-1 accent-primary"
          />
          <input
            type="number"
            min={0}
            max={255}
            value={tolerance}
            onChange={(e) =>
              setTolerance(
                Math.min(
                  255,
                  Math.max(0, Math.round(Number(e.target.value)) || 0),
                ),
              )
            }
            className="h-7 w-14 rounded-md border bg-background px-1 text-center tabular-nums"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={keepShading}
            onChange={(e) => setKeepShading(e.target.checked)}
          />
          Keep shading: shift similar colours by the same amount instead of
          making them all one colour
        </label>

        <FormMessage tone="muted" className="tabular-nums">
          {changed
            ? `${changed} ${changed === 1 ? "pixel changes" : "pixels change"}.`
            : "No pixel matches. Raise the tolerance or pick another colour."}
        </FormMessage>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!changed}>
            Replace
          </Button>
        </div>
      </form>
    </dialog>
  );
}
