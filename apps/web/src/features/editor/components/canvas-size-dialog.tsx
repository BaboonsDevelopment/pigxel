"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { MAX_SIZE, MIN_SIZE } from "../pixel-canvas/constants";
import {
  ANCHORS,
  NO_BORDERS,
  bordersFor,
  sameAnchor,
  sizeWith,
  type Anchor,
  type Borders,
} from "@/lib/sprite/canvas-size";
import { NumberField } from "./number-field";

type Size = { w: number; h: number };

const PREVIEW = { w: 320, h: 180 };

const BORDER_FIELDS: { key: keyof Borders; label: string }[] = [
  { key: "left", label: "Left" },
  { key: "top", label: "Top" },
  { key: "right", label: "Right" },
  { key: "bottom", label: "Bottom" },
];

const ARROWS: Record<string, string> = {
  "-1,-1": "↖",
  "0,-1": "↑",
  "1,-1": "↗",
  "-1,0": "←",
  "1,0": "→",
  "-1,1": "↙",
  "0,1": "↓",
  "1,1": "↘",
};

export default function CanvasSizeDialog({
  size,
  picture,
  onApply,
  onClose,
}: {
  size: Size;
  picture: Uint8ClampedArray;
  onApply: (next: Size, offset: { x: number; y: number }) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [anchor, setAnchor] = useState<Anchor>({ x: 0.5, y: 0.5 });
  const [borders, setBorders] = useState<Borders>(NO_BORDERS);
  useEffect(() => dialog.current?.showModal(), []);

  const next = sizeWith(size, borders);
  const problem =
    next.w < MIN_SIZE || next.h < MIN_SIZE
      ? `The tile must be at least ${MIN_SIZE} × ${MIN_SIZE} px.`
      : next.w > MAX_SIZE || next.h > MAX_SIZE
        ? `The tile can be at most ${MAX_SIZE} × ${MAX_SIZE} px.`
        : null;
  const unchanged =
    borders.left === 0 &&
    borders.top === 0 &&
    borders.right === 0 &&
    borders.bottom === 0;

  const resizeTo = (w: number, h: number) => {
    const around = bordersFor(size, { w, h }, anchor);
    setBorders((b) => ({
      ...(w === next.w ? b : { ...b, left: around.left, right: around.right }),
      ...(h === next.h
        ? { top: b.top, bottom: b.bottom }
        : { top: around.top, bottom: around.bottom }),
    }));
  };

  const locked = (key: keyof Borders) =>
    (key === "left" && anchor.x === 0) ||
    (key === "right" && anchor.x === 1) ||
    (key === "top" && anchor.y === 0) ||
    (key === "bottom" && anchor.y === 1);
  const setSide = (key: keyof Borders, n: number) =>
    setBorders((b) => {
      const across = key === "left" || key === "right";
      if ((across ? anchor.x : anchor.y) !== 0.5) return { ...b, [key]: n };
      return across ? { ...b, left: n, right: n } : { ...b, top: n, bottom: n };
    });

  const newAt = { x: -borders.left, y: -borders.top };
  const from = { x: Math.min(0, newAt.x), y: Math.min(0, newAt.y) };
  const span = {
    w: Math.max(size.w, newAt.x + next.w) - from.x,
    h: Math.max(size.h, newAt.y + next.h) - from.y,
  };
  const fit = Math.min(PREVIEW.w / span.w, PREVIEW.h / span.h);
  const zoom = fit >= 1 ? Math.floor(fit) : fit;

  useEffect(() => {
    const ctx = preview.current?.getContext("2d");
    if (!ctx || !span.w || !span.h) return;
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    const source = document.createElement("canvas");
    source.width = size.w;
    source.height = size.h;
    source
      .getContext("2d")
      ?.putImageData(
        new ImageData(new Uint8ClampedArray(picture), size.w, size.h),
        0,
        0,
      );
    const oldX = -from.x * zoom;
    const oldY = -from.y * zoom;
    const newX = (newAt.x - from.x) * zoom;
    const newY = (newAt.y - from.y) * zoom;
    const fill = getComputedStyle(ctx.canvas).color;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, oldX, oldY, size.w * zoom, size.h * zoom);
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.rect(newX, newY, next.w * zoom, next.h * zoom);
    ctx.fill("evenodd");
    ctx.restore();
    ctx.strokeStyle = fill;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(newX + 1, newY + 1, next.w * zoom - 2, next.h * zoom - 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picture, size, borders, zoom]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="canvas-size-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="canvas-size-title">Canvas size</SectionTitle>
          <Lead className="mt-1">
            Add or cut space around the drawing; nothing is stretched.
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
          onApply(next, { x: borders.left, y: borders.top });
          dialog.current?.close();
        }}
      >
        <div className="flex justify-center overflow-hidden rounded-lg border bg-muted p-3">
          <div className="bg-checker">
            <canvas
              ref={preview}
              width={Math.ceil(span.w * zoom)}
              height={Math.ceil(span.h * zoom)}
              aria-label="The tile with its new size outlined"
              className="block text-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                id="canvas-w"
                label="Width, px"
                value={next.w}
                onChange={(w) => resizeTo(w, next.h)}
              />
              <NumberField
                id="canvas-h"
                label="Height, px"
                value={next.h}
                onChange={(h) => resizeTo(next.w, h)}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BORDER_FIELDS.map(({ key, label }) => (
                <NumberField
                  key={key}
                  id={`canvas-${key}`}
                  label={label}
                  value={borders[key]}
                  disabled={locked(key)}
                  onChange={(n) => setSide(key, n)}
                />
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="mb-1 text-xs font-medium">
              Keep the drawing at
            </legend>
            <div className="grid grid-cols-3 gap-1">
              {ANCHORS.map((cell) => {
                const dx = (cell.x - anchor.x) * 2;
                const dy = (cell.y - anchor.y) * 2;
                const on = sameAnchor(cell, anchor);
                return (
                  <button
                    key={`${cell.x},${cell.y}`}
                    type="button"
                    aria-label={`Keep the drawing at the ${anchorName(cell)}`}
                    title={`Keep the drawing at the ${anchorName(cell)}`}
                    aria-pressed={on}
                    onClick={() => {
                      setAnchor(cell);
                      setBorders(bordersFor(size, next, cell));
                    }}
                    className={cn(
                      "grid size-8 place-items-center rounded-md border text-sm transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {on ? "●" : (ARROWS[`${dx},${dy}`] ?? "")}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 max-w-26 text-[11px] leading-tight text-muted-foreground">
              New space goes where the arrows point
            </p>
          </fieldset>
        </div>

        <FormMessage
          tone={problem ? "error" : "muted"}
          className="tabular-nums"
        >
          {problem ??
            (unchanged
              ? "Type a new width or height, or how many pixels to add on a side (a negative number cuts that side)."
              : `${size.w} × ${size.h} → ${next.w} × ${next.h} px: ${describeBorders(borders)}, in every layer and frame.`)}
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
            Resize
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function describeBorders(borders: Borders) {
  return BORDER_FIELDS.flatMap(({ key }) => {
    const n = borders[key];
    const side =
      key === "top"
        ? "on top"
        : `${key === "bottom" ? "at the" : "on the"} ${key}`;
    return n > 0
      ? [`adds ${n} px ${side}`]
      : n < 0
        ? [`cuts ${-n} px ${side}`]
        : [];
  }).join(", ");
}

function anchorName({ x, y }: Anchor) {
  const across = x === 0 ? "left" : x === 1 ? "right" : "";
  const down = y === 0 ? "top" : y === 1 ? "bottom" : "";
  return across || down ? `${down} ${across}`.trim() : "centre";
}
