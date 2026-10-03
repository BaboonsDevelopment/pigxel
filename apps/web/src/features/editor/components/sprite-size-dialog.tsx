"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Checkbox,
  ChoiceCard,
  ChoiceText,
  Radio,
} from "@pigxel/ui/components/choice";
import { FormMessage } from "@pigxel/ui/components/field";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { MAX_SIZE, MIN_SIZE } from "@/components/pixel-canvas/constants";
import {
  SCALE_METHODS,
  scalePicture,
  sizeAtPercent,
  type ScaleMethod,
} from "@/lib/sprite/sprite-size";
import { NumberField } from "./number-field";

type Size = { w: number; h: number };

const PREVIEW = { w: 320, h: 160 };

const METHOD_HINTS: Record<ScaleMethod, string> = {
  nearest: "Crisp pixels. Best for 2×, 3×, ½× and other whole steps.",
  bilinear: "Smooth, with new in-between colours. For soft art, not pixel art.",
  rotsprite:
    "Keeps pixel art crisp at any size, smoothing jagged diagonals. Best for 1.5× and the like.",
};

export default function SpriteSizeDialog({
  size,
  picture,
  onApply,
  onClose,
}: {
  size: Size;
  picture: Uint8ClampedArray;
  onApply: (next: Size, method: ScaleMethod) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [next, setNext] = useState<Size>(size);
  const [locked, setLocked] = useState(true);
  const [method, setMethod] = useState<ScaleMethod>("nearest");
  useEffect(() => dialog.current?.showModal(), []);

  const problem =
    next.w < MIN_SIZE || next.h < MIN_SIZE
      ? `The tile must be at least ${MIN_SIZE} × ${MIN_SIZE} px.`
      : next.w > MAX_SIZE || next.h > MAX_SIZE
        ? `The tile can be at most ${MAX_SIZE} × ${MAX_SIZE} px.`
        : null;
  const unchanged = next.w === size.w && next.h === size.h;
  const percent = Math.round((next.w / size.w) * 100);

  const setWidth = (w: number) =>
    setNext((n) => ({
      w,
      h: locked ? Math.max(1, Math.round((w * size.h) / size.w)) : n.h,
    }));
  const setHeight = (h: number) =>
    setNext((n) => ({
      w: locked ? Math.max(1, Math.round((h * size.w) / size.h)) : n.w,
      h,
    }));

  const scaled = useMemo(
    () =>
      problem
        ? null
        : scalePicture(
            { rgba: picture, w: size.w, h: size.h },
            next.w,
            next.h,
            method,
          ),
    [problem, picture, size, next, method],
  );
  const fit = Math.min(PREVIEW.w / next.w, PREVIEW.h / next.h);
  const zoom = fit >= 1 ? Math.floor(fit) : fit;

  useEffect(() => {
    const ctx = preview.current?.getContext("2d");
    if (!ctx || !scaled) return;
    const source = document.createElement("canvas");
    source.width = next.w;
    source.height = next.h;
    source
      .getContext("2d")
      ?.putImageData(
        new ImageData(new Uint8ClampedArray(scaled), next.w, next.h),
        0,
        0,
      );
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(source, 0, 0, next.w * zoom, next.h * zoom);
  }, [scaled, next, zoom]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="sprite-size-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="sprite-size-title">Sprite size</SectionTitle>
          <Lead className="mt-1">
            Scale the whole drawing, in every layer and frame.
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
          if (problem || unchanged) return;
          onApply(next, method);
          dialog.current?.close();
        }}
      >
        <div className="flex min-h-24 justify-center overflow-hidden rounded-lg border bg-muted p-3">
          {scaled && (
            <div className="self-center bg-checker">
              <canvas
                ref={preview}
                width={Math.ceil(next.w * zoom)}
                height={Math.ceil(next.h * zoom)}
                aria-label="The current frame at the new size"
                className="block"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 items-end gap-3">
          <NumberField
            id="sprite-w"
            label="Width, px"
            value={next.w}
            onChange={setWidth}
          />
          <NumberField
            id="sprite-h"
            label="Height, px"
            value={next.h}
            onChange={setHeight}
          />
          <NumberField
            id="sprite-percent"
            label="Scale, %"
            value={percent}
            disabled={!locked}
            onChange={(p) => setNext(sizeAtPercent(size.w, size.h, p))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={locked}
            onChange={(e) => {
              setLocked(e.target.checked);
              if (e.target.checked)
                setNext((n) => ({
                  w: n.w,
                  h: Math.max(1, Math.round((n.w * size.h) / size.w)),
                }));
            }}
          />
          Keep proportions
        </label>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Method</legend>
          {SCALE_METHODS.map(({ value, label }) => (
            <ChoiceCard key={value} className="p-3">
              <Radio
                name="scale-method"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
              />
              <ChoiceText title={label}>{METHOD_HINTS[value]}</ChoiceText>
            </ChoiceCard>
          ))}
        </fieldset>

        <FormMessage
          tone={problem ? "error" : "muted"}
          className="tabular-nums"
        >
          {problem ??
            (unchanged
              ? "Type a new width, height or scale."
              : `${size.w} × ${size.h} → ${next.w} × ${next.h} px, in every layer and frame.`)}
        </FormMessage>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!!problem || unchanged}>
            Scale
          </Button>
        </div>
      </form>
    </dialog>
  );
}
