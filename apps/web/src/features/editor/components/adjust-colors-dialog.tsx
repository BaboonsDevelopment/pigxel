"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { adjustedColors, type AdjustKind } from "../pixel-canvas/effects";

type Size = { w: number; h: number };

const SLIDERS = {
  hueSaturation: [
    { key: "hue", label: "Hue", max: 180 },
    { key: "saturation", label: "Saturation", max: 100 },
    { key: "lightness", label: "Lightness", max: 100 },
  ],
  brightnessContrast: [
    { key: "brightness", label: "Brightness", max: 100 },
    { key: "contrast", label: "Contrast", max: 100 },
  ],
} as const;

const TITLES = {
  hueSaturation: "Hue / Saturation",
  brightnessContrast: "Brightness / Contrast",
};

const PREVIEW = { w: 320, h: 180 };

export default function AdjustColorsDialog({
  kind,
  size,
  pixels,
  mask,
  onApply,
  onClose,
}: {
  kind: AdjustKind;
  size: Size;
  pixels: Uint8ClampedArray;
  mask: Uint8Array | null;
  onApply: (values: Record<string, number>) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  useEffect(() => dialog.current?.showModal(), []);

  const result = useMemo(
    () => adjustedColors(kind, pixels, mask, values),
    [kind, pixels, mask, values],
  );
  const untouched = SLIDERS[kind].every(({ key }) => !values[key]);
  const fit = Math.min(PREVIEW.w / size.w, PREVIEW.h / size.h);
  const zoom = fit >= 1 ? Math.floor(fit) : fit;

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
      aria-labelledby="adjust-colors-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="adjust-colors-title">{TITLES[kind]}</SectionTitle>
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
        className="space-y-5 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (untouched) return;
          onApply(values);
          dialog.current?.close();
        }}
      >
        <div className="flex min-h-24 justify-center overflow-hidden rounded-lg border bg-muted p-3">
          <div className="self-center bg-checker">
            <canvas
              ref={preview}
              width={Math.ceil(size.w * zoom)}
              height={Math.ceil(size.h * zoom)}
              aria-label="The layer with the adjustment"
              className="block"
            />
          </div>
        </div>

        <div className="space-y-3">
          {SLIDERS[kind].map(({ key, label, max }) => {
            const value = values[key] ?? 0;
            const set = (next: number) =>
              setValues((v) => ({
                ...v,
                [key]: Math.min(max, Math.max(-max, Math.round(next) || 0)),
              }));
            return (
              <label key={key} className="flex items-center gap-3 text-sm">
                <span className="w-20 font-medium">{label}</span>
                <input
                  type="range"
                  min={-max}
                  max={max}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  onDoubleClick={() => set(0)}
                  className="min-w-0 flex-1 accent-primary"
                />
                <input
                  type="number"
                  min={-max}
                  max={max}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="h-7 w-14 rounded-md border bg-background px-1 text-center tabular-nums"
                />
              </label>
            );
          })}
        </div>

        <FormMessage tone="muted">
          Double-click a slider to reset it.
        </FormMessage>

        <div className="flex justify-between gap-2 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={untouched}
            onClick={() => setValues({})}
          >
            Reset
          </Button>
          <span className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={untouched}>
              Apply
            </Button>
          </span>
        </div>
      </form>
    </dialog>
  );
}
