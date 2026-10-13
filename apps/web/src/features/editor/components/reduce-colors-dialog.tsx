"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@pigxel/ui/components/choice";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
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
import { SIZE_LABEL, SizeField } from "./size-controls";

type Size = { w: number; h: number };

export type ReduceChoice = {
  palette: string[];
  dither: ReduceDither;
  replacePalette: boolean;
};

const PREVIEW = { w: 320, h: 160 };

const option = (on: boolean) =>
  cn(
    "h-11 rounded-xl border px-3 text-sm transition-colors",
    on
      ? "border-primary-soft bg-pastel-pink-soft font-semibold"
      : "bg-background hover:bg-pink-base",
  );

type ReduceProps = {
  size: Size;
  frames: Uint8ClampedArray[];
  picture: Uint8ClampedArray;
  palette: string[];
  onApply: (choice: ReduceChoice) => void;
};

export default function ReduceColorsDialog({
  onClose,
  ...props
}: ReduceProps & { onClose: () => void }) {
  return (
    <Dialog
      onClose={onClose}
      size="sm"
      portal
      className="w-[min(30rem,calc(100vw-2rem))]"
    >
      <ReduceForm {...props} />
    </Dialog>
  );
}

function ReduceForm({ size, frames, picture, palette, onApply }: ReduceProps) {
  const { close } = useDialog();
  const preview = useRef<HTMLCanvasElement>(null);
  const [target, setTarget] = useState<"count" | "palette">("count");
  const [count, setCount] = useState("16");
  const [dither, setDither] = useState<ReduceDither>("none");
  const [replacePalette, setReplacePalette] = useState(true);

  const wanted = Number(count);
  const before = useMemo(() => countColors(frames), [frames]);
  const valid =
    Number.isInteger(wanted) && wanted >= MIN_REDUCE && wanted <= MAX_REDUCE;
  const colors = useMemo(
    () =>
      target === "palette"
        ? [...new Set(palette.map(opaqueHex))]
        : valid
          ? reducedPalette(frames, wanted)
          : [],
    [target, palette, frames, wanted, valid],
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
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (problem) return;
        onApply({
          palette: colors,
          dither,
          replacePalette: target === "count" && replacePalette,
        });
        close();
      }}
    >
      <ModalHeader title="Reduce Colours" />
      <DialogBody className="grid gap-5 py-5">
        <div className="flex min-h-24 justify-center overflow-hidden rounded-xl border bg-background p-3">
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

        <fieldset>
          <legend className={SIZE_LABEL}>Reduce to</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={target === "count"}
              onClick={() => setTarget("count")}
              className={option(target === "count")}
            >
              Number of colours
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={target === "palette"}
              onClick={() => setTarget("palette")}
              className={option(target === "palette")}
            >
              Tile palette ({palette.length})
            </button>
          </div>
        </fieldset>

        {target === "count" && (
          <div className="grid gap-3">
            <SizeField
              id="reduce-count"
              label="Colours"
              unit="colours"
              value={count}
              onChange={setCount}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={replacePalette}
                onChange={(e) => setReplacePalette(e.target.checked)}
              />
              Make these colours the palette
            </label>
          </div>
        )}

        <fieldset>
          <legend className={SIZE_LABEL}>Dithering</legend>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {REDUCE_DITHERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={dither === value}
                onClick={() => setDither(value)}
                className={option(dither === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm tabular-nums",
            problem ? "bg-attention-soft" : "bg-success-soft",
          )}
        >
          {problem ??
            `${before} ${before === 1 ? "colour" : "colours"} → ${colors.length}, in every layer and frame.`}
        </p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!!problem}>
          Reduce
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
