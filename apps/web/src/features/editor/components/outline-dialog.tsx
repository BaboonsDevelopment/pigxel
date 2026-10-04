"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Radio } from "@pigxel/ui/components/choice";
import { FormMessage } from "@pigxel/ui/components/field";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import {
  MAX_OUTLINE,
  outlinedWith,
  type OutlinePlace,
  type OutlineShape,
} from "../pixel-canvas/effects";
import { rgbaOf } from "../pixel-canvas/paint";
import { ColorPicker } from "./colors/color-picker";
import { swatchStyle } from "./colors/helpers";

type Size = { w: number; h: number };

export type OutlineChoice = {
  color: string;
  place: OutlinePlace;
  shape: OutlineShape;
  width: number;
};

const PLACES: { value: OutlinePlace; label: string }[] = [
  { value: "outside", label: "Outside" },
  { value: "inside", label: "Inside" },
];

const SHAPES: { value: OutlineShape; label: string; hint: string }[] = [
  { value: "round", label: "Round", hint: "thin lines, no corner pixels" },
  { value: "square", label: "Square", hint: "fills the corners too" },
];

const PREVIEW = { w: 320, h: 180 };

export default function OutlineDialog({
  size,
  pixels,
  mask,
  palette,
  color: initialColor,
  onApply,
  onClose,
}: {
  size: Size;
  pixels: Uint8ClampedArray;
  mask: Uint8Array | null;
  palette: string[];
  color: string;
  onApply: (choice: OutlineChoice) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(initialColor);
  const [place, setPlace] = useState<OutlinePlace>("outside");
  const [shape, setShape] = useState<OutlineShape>("round");
  const [width, setWidth] = useState(1);
  useEffect(() => dialog.current?.showModal(), []);

  const result = useMemo(
    () =>
      outlinedWith(pixels, size, rgbaOf(color), mask, { place, shape, width }),
    [pixels, size, color, mask, place, shape, width],
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
      aria-labelledby="outline-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="outline-title">Outline</SectionTitle>
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
          onApply({ color, place, shape, width });
          dialog.current?.close();
        }}
      >
        <div className="flex min-h-24 justify-center overflow-hidden rounded-lg border bg-muted p-3">
          <div className="self-center bg-checker">
            <canvas
              ref={preview}
              width={Math.ceil(size.w * zoom)}
              height={Math.ceil(size.h * zoom)}
              aria-label="The layer with the outline"
              className="block"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-4">
            <fieldset className="space-y-2 text-sm">
              <legend className="mb-1 font-medium">Place</legend>
              {PLACES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2">
                  <Radio
                    name="outline-place"
                    className="mt-0"
                    checked={place === value}
                    onChange={() => setPlace(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <fieldset className="space-y-2 text-sm">
              <legend className="mb-1 font-medium">Shape</legend>
              {SHAPES.map(({ value, label, hint }) => (
                <label key={value} className="flex items-start gap-2">
                  <Radio
                    name="outline-shape"
                    checked={shape === value}
                    onChange={() => setShape(value)}
                  />
                  <span>
                    {label}
                    <span className="block text-xs text-muted-foreground">
                      {hint}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="flex items-center gap-3 text-sm">
              <span className="font-medium">Width</span>
              <input
                type="number"
                min={1}
                max={MAX_OUTLINE}
                value={width}
                onChange={(e) =>
                  setWidth(
                    Math.min(
                      MAX_OUTLINE,
                      Math.max(1, Math.round(Number(e.target.value)) || 1),
                    ),
                  )
                }
                className="h-7 w-14 rounded-md border bg-background px-1 text-center tabular-nums"
              />
              <span className="text-muted-foreground">px</span>
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Colour</p>
            <ColorPicker color={color} onChange={setColor} />
          </div>
        </div>

        {palette.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {palette.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                title={c}
                onClick={() => setColor(c)}
                className={cn(
                  "size-5 rounded-[2px] ring-1 ring-black/10",
                  c === color && "ring-2 ring-foreground",
                )}
                style={swatchStyle(c)}
              />
            ))}
          </div>
        )}

        <FormMessage tone="muted" className="tabular-nums">
          {changed
            ? `${changed} ${changed === 1 ? "pixel changes" : "pixels change"}.`
            : "Nothing to outline here."}
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
            Outline
          </Button>
        </div>
      </form>
    </dialog>
  );
}
