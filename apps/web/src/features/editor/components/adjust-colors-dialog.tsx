"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import {
  CONVOLUTIONS,
  STRAIGHT_CURVE,
  adjustedColors,
  type AdjustKind,
  type AdjustSettings,
} from "../pixel-canvas/effects";
import { CurveEditor } from "./curve-editor";
import { MatrixEditor } from "./matrix-editor";

type Size = { w: number; h: number };

const SLIDERS = {
  hueSaturation: [
    { key: "hue", label: "Hue", min: -180, max: 180, initial: 0 },
    { key: "saturation", label: "Saturation", min: -100, max: 100, initial: 0 },
    { key: "lightness", label: "Lightness", min: -100, max: 100, initial: 0 },
  ],
  brightnessContrast: [
    { key: "brightness", label: "Brightness", min: -100, max: 100, initial: 0 },
    { key: "contrast", label: "Contrast", min: -100, max: 100, initial: 0 },
  ],
  despeckle: [{ key: "radius", label: "Radius", min: 1, max: 5, initial: 1 }],
  curve: [],
  convolution: [
    { key: "bias", label: "Bias", min: -255, max: 255, initial: 0 },
  ],
} as const;

const TITLES = {
  hueSaturation: "Hue / Saturation",
  brightnessContrast: "Brightness / Contrast",
  despeckle: "Despeckle",
  curve: "Colour curve",
  convolution: "Convolution matrix",
};

const HINTS = {
  hueSaturation: "Double-click a slider to reset it.",
  brightnessContrast: "Double-click a slider to reset it.",
  despeckle:
    "Each pixel takes the middle colour of its neighbours, so lone stray pixels disappear.",
  curve:
    "Click the curve to add a point and drag it. Double-click or right-click a point to remove it.",
  convolution:
    "Each pixel becomes its neighbours weighted by the grid, divided by the grid’s sum, plus the bias.",
};

const FIRST = CONVOLUTIONS[0]!;

const initialValues = (kind: AdjustKind) =>
  Object.fromEntries(
    SLIDERS[kind].map(({ key, initial }) => [key, initial as number]),
  );

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
  onApply: (settings: AdjustSettings) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [values, setValues] = useState(() => initialValues(kind));
  const [curve, setCurve] = useState(STRAIGHT_CURVE);
  const [matrix, setMatrix] = useState(FIRST.matrix);
  useEffect(() => dialog.current?.showModal(), []);

  const result = useMemo(
    () => adjustedColors(kind, pixels, mask, size, { values, curve, matrix }),
    [kind, pixels, mask, size, values, curve, matrix],
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
  const untouched =
    curve === STRAIGHT_CURVE &&
    matrix === FIRST.matrix &&
    SLIDERS[kind].every(({ key, initial }) => values[key] === initial);
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
          if (!changed) return;
          onApply({ values, curve, matrix });
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

        {kind === "curve" && (
          <div className="flex justify-center">
            <CurveEditor points={curve} onChange={setCurve} />
          </div>
        )}

        {kind === "convolution" && (
          <MatrixEditor
            matrix={matrix}
            onChange={setMatrix}
            onPreset={({ matrix, bias }) => {
              setMatrix(matrix);
              setValues((v) => ({ ...v, bias }));
            }}
          />
        )}

        <div className="space-y-3">
          {SLIDERS[kind].map(({ key, label, min, max, initial }) => {
            const value = values[key] ?? initial;
            const set = (next: number) =>
              setValues((v) => ({
                ...v,
                [key]: Math.min(
                  max,
                  Math.max(min, Math.round(next) || initial),
                ),
              }));
            return (
              <label key={key} className="flex items-center gap-3 text-sm">
                <span className="w-20 font-medium">{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  onDoubleClick={() => set(initial)}
                  className="min-w-0 flex-1 accent-primary"
                />
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="h-7 w-14 rounded-md border bg-background px-1 text-center tabular-nums"
                />
              </label>
            );
          })}
        </div>

        <FormMessage tone="muted" className="tabular-nums">
          {HINTS[kind]}{" "}
          {changed
            ? `${changed} ${changed === 1 ? "pixel changes" : "pixels change"}.`
            : "Nothing changes yet."}
        </FormMessage>

        <div className="flex justify-between gap-2 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            disabled={untouched}
            onClick={() => {
              setValues(initialValues(kind));
              setCurve(STRAIGHT_CURVE);
              setMatrix(FIRST.matrix);
            }}
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
            <Button type="submit" disabled={!changed}>
              Apply
            </Button>
          </span>
        </div>
      </form>
    </dialog>
  );
}
