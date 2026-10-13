"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { Input } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { opaqueHex } from "@/lib/palette/hsv";
import {
  MAX_OUTLINE,
  outlinedWith,
  type OutlinePlace,
  type OutlineShape,
} from "../pixel-canvas/effects";
import { rgbaOf } from "../pixel-canvas/paint";
import { swatchStyle } from "./colors/helpers";
import { MiniColorPicker } from "./colors/mini-color-picker";
import { AllFramesOption } from "./all-frames-option";
import { SIZE_LABEL, SizeField } from "./size-controls";

type Size = { w: number; h: number };

export type OutlineChoice = {
  color: string;
  place: OutlinePlace;
  shape: OutlineShape;
  width: number;
  allFrames: boolean;
};

const PLACES: { value: OutlinePlace; label: string }[] = [
  { value: "outside", label: "Outside" },
  { value: "inside", label: "Inside" },
];

const SHAPES: { value: OutlineShape; label: string; hint: string }[] = [
  { value: "round", label: "Round", hint: "Thin lines, no corner pixels." },
  { value: "square", label: "Square", hint: "Fills the corners too." },
];

const PREVIEW = { w: 320, h: 160 };

const option = (on: boolean) =>
  cn(
    "h-11 rounded-xl border px-3 text-sm transition-colors",
    on
      ? "border-primary-soft bg-pastel-pink-soft font-semibold"
      : "bg-background hover:bg-pink-base",
  );

type OutlineProps = {
  size: Size;
  pixels: Uint8ClampedArray;
  mask: Uint8Array | null;
  palette: string[];
  frameCount: number;
  color: string;
  onApply: (choice: OutlineChoice) => void;
};

export default function OutlineDialog({
  onClose,
  ...props
}: OutlineProps & { onClose: () => void }) {
  return (
    <Dialog
      onClose={onClose}
      size="sm"
      portal
      className="w-[min(30rem,calc(100vw-2rem))]"
    >
      <OutlineForm {...props} />
    </Dialog>
  );
}

function OutlineForm({
  size,
  pixels,
  mask,
  palette,
  frameCount,
  color: initialColor,
  onApply,
}: OutlineProps) {
  const { close } = useDialog();
  const preview = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(initialColor);
  const [hex, setHex] = useState(() => opaqueHex(initialColor));
  const [custom, setCustom] = useState(!palette.length);
  const [place, setPlace] = useState<OutlinePlace>("outside");
  const [shape, setShape] = useState<OutlineShape>("round");
  const [width, setWidth] = useState("1");
  const [allFrames, setAllFrames] = useState(false);
  const thickness = Math.min(
    MAX_OUTLINE,
    Math.max(1, Math.round(Number(width)) || 1),
  );
  const pick = (next: string) => {
    setColor(next);
    setHex(opaqueHex(next));
  };

  const result = useMemo(
    () =>
      outlinedWith(pixels, size, rgbaOf(color), mask, {
        place,
        shape,
        width: thickness,
      }),
    [pixels, size, color, mask, place, shape, thickness],
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
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!changed && !allFrames) return;
        onApply({ color, place, shape, width: thickness, allFrames });
        close();
      }}
    >
      <ModalHeader title="Outline" />
      <DialogBody className="grid gap-5 py-5">
        <div className="flex min-h-24 justify-center overflow-hidden rounded-xl border bg-background p-3">
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

        <div className="grid grid-cols-2 gap-4">
          <fieldset>
            <legend className={SIZE_LABEL}>Place</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {PLACES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={place === value}
                  onClick={() => setPlace(value)}
                  className={option(place === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={SIZE_LABEL}>Shape</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {SHAPES.map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={shape === value}
                  title={hint}
                  onClick={() => setShape(value)}
                  className={option(shape === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">
          {SHAPES.find((s) => s.value === shape)?.hint}
        </p>

        <SizeField
          id="outline-width"
          label="Width"
          unit="px"
          value={width}
          onChange={setWidth}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={cn(SIZE_LABEL, "mb-0")}>
              {custom ? "Custom colour" : "Palette"}
            </span>
            {palette.length > 0 && (
              <button
                type="button"
                aria-expanded={custom}
                onClick={() => setCustom(!custom)}
                className="text-xs text-link-accent transition-colors hover:text-lavender-foreground"
              >
                {custom ? "Show swatches" : "Custom colour…"}
              </button>
            )}
          </div>
          {custom ? (
            <MiniColorPicker color={color} onChange={pick} />
          ) : (
            <div className="flex max-h-[6.5rem] snap-y flex-wrap gap-1.5 overflow-y-auto rounded-xl border p-2.5">
              {palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={c === color}
                  title={c}
                  onClick={() => pick(c)}
                  className={cn(
                    "size-6 snap-start scroll-mt-2.5 rounded-md ring-1 ring-black/10",
                    c === color && "ring-2 ring-pink-strong ring-offset-1",
                  )}
                  style={swatchStyle(c)}
                />
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span
              className="size-10 shrink-0 rounded-xl ring-1 ring-black/10"
              style={swatchStyle(color)}
            />
            <Input
              aria-label="Hex colour"
              value={hex}
              maxLength={7}
              onChange={(e) => {
                const next = e.target.value.trim();
                setHex(next);
                if (/^#[0-9a-f]{6}$/i.test(next)) setColor(next.toLowerCase());
              }}
              className="h-10 w-full rounded-xl px-3 font-mono uppercase"
            />
          </div>
        </div>

        <AllFramesOption
          frameCount={frameCount}
          checked={allFrames}
          onChange={setAllFrames}
        />

        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm tabular-nums",
            changed ? "bg-success-soft" : "bg-attention-soft",
          )}
        >
          {changed
            ? `${changed} ${changed === 1 ? "pixel" : "pixels"} will change.`
            : "Nothing to outline in this frame."}
        </p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!changed && !allFrames}>
          Outline
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
