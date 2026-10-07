"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Checkbox, Radio } from "@pigxel/ui/components/choice";
import { FormMessage } from "@pigxel/ui/components/field";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { opaqueHex } from "@/lib/palette/hsv";
import {
  MAX_REDUCE,
  MIN_REDUCE,
  REDUCE_DITHERS,
  countColors,
  mapToPalette,
  reducedPalette,
  type ReduceDither,
} from "@/lib/palette/reduce";
import { NumberField } from "./number-field";

type Size = { w: number; h: number };

export type ReduceChoice = {
  palette: string[];
  dither: ReduceDither;
  replacePalette: boolean;
};

const PREVIEW = { w: 320, h: 180 };

export default function ReduceColorsDialog({
  size,
  frames,
  picture,
  palette,
  onApply,
  onClose,
}: {
  size: Size;
  frames: Uint8ClampedArray[];
  picture: Uint8ClampedArray;
  palette: string[];
  onApply: (choice: ReduceChoice) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [target, setTarget] = useState<"count" | "palette">("count");
  const [count, setCount] = useState(16);
  const [dither, setDither] = useState<ReduceDither>("none");
  const [replacePalette, setReplacePalette] = useState(true);
  useEffect(() => dialog.current?.showModal(), []);

  const before = useMemo(() => countColors(frames), [frames]);
  const valid = count >= MIN_REDUCE && count <= MAX_REDUCE;
  const colors = useMemo(
    () =>
      target === "palette"
        ? [...new Set(palette.map(opaqueHex))]
        : valid
          ? reducedPalette(frames, count)
          : [],
    [target, palette, frames, count, valid],
  );
  const problem =
    target === "count" && !valid
      ? `Pick between ${MIN_REDUCE} and ${MAX_REDUCE} colours.`
      : !colors.length
        ? target === "palette"
          ? "The palette is empty."
          : "Nothing is drawn on the tile yet."
        : null;

  const reduced = useMemo(
    () =>
      colors.length ? mapToPalette(picture, size.w, colors, dither) : null,
    [picture, size.w, colors, dither],
  );
  const fit = Math.min(PREVIEW.w / size.w, PREVIEW.h / size.h);
  const zoom = fit >= 1 ? Math.floor(fit) : fit;

  useEffect(() => {
    const ctx = preview.current?.getContext("2d");
    if (!ctx || !reduced) return;
    const source = document.createElement("canvas");
    source.width = size.w;
    source.height = size.h;
    source
      .getContext("2d")
      ?.putImageData(
        new ImageData(new Uint8ClampedArray(reduced), size.w, size.h),
        0,
        0,
      );
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(source, 0, 0, size.w * zoom, size.h * zoom);
  }, [reduced, size, zoom]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="reduce-colors-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="reduce-colors-title">Reduce colours</SectionTitle>
          <Lead className="mt-1">
            Every layer and frame gets only the colours you choose.
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
          if (problem) return;
          onApply({
            palette: colors,
            dither,
            replacePalette: target === "count" && replacePalette,
          });
          dialog.current?.close();
        }}
      >
        <div className="flex min-h-24 justify-center overflow-hidden rounded-lg border bg-muted p-3">
          {reduced && (
            <div className="self-center bg-checker">
              <canvas
                ref={preview}
                width={Math.ceil(size.w * zoom)}
                height={Math.ceil(size.h * zoom)}
                aria-label="The current frame with the reduced colours"
                className="block"
              />
            </div>
          )}
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-sm font-medium">Reduce to</legend>
          <label className="flex items-center gap-3 text-sm">
            <Radio
              name="reduce-target"
              className="mt-0"
              checked={target === "count"}
              onChange={() => setTarget("count")}
            />
            <span className="w-24">
              <NumberField
                id="reduce-count"
                label="Colours"
                value={count}
                disabled={target !== "count"}
                onChange={setCount}
              />
            </span>
          </label>
          {target === "count" && (
            <label className="flex items-center gap-2 pl-7 text-sm">
              <Checkbox
                checked={replacePalette}
                onChange={(e) => setReplacePalette(e.target.checked)}
              />
              Make these colours the palette
            </label>
          )}
          <label className="flex items-center gap-3 text-sm">
            <Radio
              name="reduce-target"
              className="mt-0"
              checked={target === "palette"}
              onChange={() => setTarget("palette")}
            />
            The tile’s palette ({palette.length}{" "}
            {palette.length === 1 ? "colour" : "colours"})
          </label>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Dithering</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {REDUCE_DITHERS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <Radio
                  name="reduce-dither"
                  className="mt-0"
                  checked={dither === value}
                  onChange={() => setDither(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <FormMessage
          tone={problem ? "error" : "muted"}
          className="tabular-nums"
        >
          {problem ??
            `${before} ${before === 1 ? "colour" : "colours"} → ${colors.length}, in every layer and frame.`}
        </FormMessage>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!!problem}>
            Reduce
          </Button>
        </div>
      </form>
    </dialog>
  );
}
