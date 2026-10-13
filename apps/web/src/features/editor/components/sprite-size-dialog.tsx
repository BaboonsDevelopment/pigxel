"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { MAX_SIZE, MIN_SIZE } from "../pixel-canvas/constants";
import {
  SCALE_METHODS,
  scalePicture,
  sizeAtPercent,
  type ScaleMethod,
} from "@/lib/sprite/sprite-size";
import { LockSwitch, SIZE_LABEL, SizeField } from "./size-controls";

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
  return (
    <Dialog onClose={onClose} size="md" portal>
      <ScaleForm size={size} picture={picture} onApply={onApply} />
    </Dialog>
  );
}

function ScaleForm({
  size,
  picture,
  onApply,
}: {
  size: Size;
  picture: Uint8ClampedArray;
  onApply: (next: Size, method: ScaleMethod) => void;
}) {
  const { close } = useDialog();
  const preview = useRef<HTMLCanvasElement>(null);
  const [next, setNext] = useState<Size>(size);
  const [locked, setLocked] = useState(true);
  const [method, setMethod] = useState<ScaleMethod>("nearest");

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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (problem || unchanged) return;
        onApply(next, method);
        close();
      }}
      className="flex min-h-0 flex-col"
    >
      <ModalHeader title="Sprite Size" />
      <DialogBody className="grid gap-6 py-6">
        <div className="flex min-h-24 justify-center overflow-hidden rounded-xl border bg-background p-3">
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
        <div className="grid grid-cols-3 gap-4">
          <SizeField
            id="sprite-w"
            label="Width"
            unit="px"
            value={String(next.w)}
            onChange={(text) => setWidth(Number(text) || 0)}
          />
          <SizeField
            id="sprite-h"
            label="Height"
            unit="px"
            value={String(next.h)}
            onChange={(text) => setHeight(Number(text) || 0)}
          />
          <SizeField
            id="sprite-percent"
            label="Scale"
            unit="%"
            value={String(percent)}
            disabled={!locked}
            onChange={(text) =>
              setNext(sizeAtPercent(size.w, size.h, Number(text) || 0))
            }
          />
        </div>
        <LockSwitch
          label="Lock aspect ratio"
          on={locked}
          onChange={(on) => {
            setLocked(on);
            if (on)
              setNext((n) => ({
                w: n.w,
                h: Math.max(1, Math.round((n.w * size.h) / size.w)),
              }));
          }}
        />
        <fieldset>
          <legend className={SIZE_LABEL}>Method</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {SCALE_METHODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={method === value}
                onClick={() => setMethod(value)}
                className={cn(
                  "h-11 rounded-xl border px-2 text-sm transition-colors",
                  method === value
                    ? "border-primary-soft bg-pastel-pink-soft font-semibold"
                    : "bg-background hover:bg-pink-base",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {METHOD_HINTS[method]}
          </p>
        </fieldset>
        {problem && <FormMessage tone="error">{problem}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!!problem || unchanged}>
          Scale
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
