"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NumericInput } from "./numeric-input";
import { Checkbox } from "@pigxel/ui/components/choice";
import { Input } from "@pigxel/ui/components/input";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { replacedColor } from "../pixel-canvas/effects";
import { rgbaOf } from "../pixel-canvas/paint";
import { cn } from "@pigxel/ui/lib/utils";
import { opaqueHex, withAlpha } from "@/lib/palette/hsv";
import { colorsOf } from "@/lib/palette/presets";
import { swatchStyle } from "./colors/helpers";
import { MiniColorPicker } from "./colors/mini-color-picker";
import { AllFramesOption } from "./all-frames-option";
import { SIZE_LABEL } from "./size-controls";

type Size = { w: number; h: number };

type Target = "from" | "to";

export type ReplaceChoice = {
  from: string;
  to: string;
  tolerance: number;
  keepShading: boolean;
  allFrames: boolean;
};

const PREVIEW = { w: 320, h: 160 };
const MAX_ZOOM = 32;
const LAYER_COLORS = 24;

type ReplaceProps = {
  size: Size;
  pixels: Uint8ClampedArray;
  mask: Uint8Array | null;
  palette: string[];
  frameCount: number;
  from: string;
  to: string;
  onApply: (choice: ReplaceChoice) => void;
};

export default function ReplaceColorDialog({
  onClose,
  ...props
}: ReplaceProps & { onClose: () => void }) {
  return (
    <Dialog
      onClose={onClose}
      size="sm"
      portal
      className="w-[min(30rem,calc(100vw-2rem))]"
    >
      <ReplaceForm {...props} />
    </Dialog>
  );
}

function ReplaceForm({
  size,
  pixels,
  mask,
  palette,
  frameCount,
  from: initialFrom,
  to: initialTo,
  onApply,
}: ReplaceProps) {
  const { close } = useDialog();
  const preview = useRef<HTMLCanvasElement>(null);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [target, setTarget] = useState<Target>("from");
  const [custom, setCustom] = useState(false);
  const [hex, setHex] = useState(() => opaqueHex(initialFrom));
  const [tolerance, setTolerance] = useState(0);
  const [keepShading, setKeepShading] = useState(false);
  const [allFrames, setAllFrames] = useState(false);
  const active = target === "from" ? from : to;
  const pick = (color: string) => {
    (target === "from" ? setFrom : setTo)(color);
    setHex(opaqueHex(color));
  };

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
  const layerColors = useMemo(() => colorsOf(pixels, LAYER_COLORS), [pixels]);
  const swatches = target === "from" || !palette.length ? layerColors : palette;
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
  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 1 && e.button !== 2) return;
    const el = e.currentTarget;
    const start = {
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    el.setPointerCapture(e.pointerId);
    const move = (event: globalThis.PointerEvent) => {
      el.scrollLeft = start.left - (event.clientX - start.x);
      el.scrollTop = start.top - (event.clientY - start.y);
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

  const slot = (which: Target, label: string, color: string) => (
    <button
      type="button"
      aria-pressed={target === which}
      onClick={() => {
        setTarget(which);
        setHex(opaqueHex(which === "from" ? from : to));
      }}
      className={cn(
        "flex h-12 min-w-0 items-center gap-2.5 rounded-xl border px-2.5 text-left transition-colors",
        target === which
          ? "border-primary-soft bg-pastel-pink-soft"
          : "bg-background hover:bg-pink-base",
      )}
    >
      <span
        className="size-7 shrink-0 rounded-lg ring-1 ring-black/10"
        style={swatchStyle(color)}
      />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );

  return (
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!changed && !allFrames) return;
        onApply({ from, to, tolerance, keepShading, allFrames });
        close();
      }}
    >
      <ModalHeader title="Replace Colour" />
      <DialogBody className="grid gap-5 py-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {slot("from", "Replace", from)}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 text-muted-foreground"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
          {slot("to", "With", to)}
        </div>

        <div className="relative">
          <div
            ref={frame}
            onPointerDown={startPan}
            onMouseDown={(e) => {
              if (e.button === 1) e.preventDefault();
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="flex max-h-56 min-h-20 overflow-auto rounded-xl border bg-background p-3"
          >
            <div className="m-auto shrink-0 bg-checker">
              <canvas
                ref={preview}
                width={Math.ceil(size.w * zoom)}
                height={Math.ceil(size.h * zoom)}
                aria-label="The layer with the colour replaced"
                title={`Click a pixel to set ${target === "from" ? "the colour to replace" : "the new colour"}`}
                onClick={(e) => {
                  const color = pickAt(e);
                  if (color) pick(color);
                }}
                className="block cursor-crosshair"
              />
            </div>
          </div>
          <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-lg border bg-background/90 p-0.5 text-xs shadow-sm">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => zoomBy(-1)}
              className="grid size-6 place-items-center rounded-md hover:bg-pink-base"
            >
              −
            </button>
            <button
              type="button"
              title="Fit"
              onClick={() => setZoom(fitted)}
              className="min-w-10 tabular-nums"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => zoomBy(1)}
              className="grid size-6 place-items-center rounded-md hover:bg-pink-base"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={cn(SIZE_LABEL, "mb-0")}>
              {custom
                ? "Custom colour"
                : target === "from" || !palette.length
                  ? "Most used in this layer"
                  : "Palette"}
            </span>
            <button
              type="button"
              aria-expanded={custom}
              onClick={() => setCustom(!custom)}
              className="text-xs text-link-accent transition-colors hover:text-lavender-foreground"
            >
              {custom ? "Show swatches" : "Custom colour…"}
            </button>
          </div>
          {custom ? (
            <MiniColorPicker color={active} onChange={pick} />
          ) : (
            <div className="flex max-h-[6.5rem] snap-y flex-wrap gap-1.5 overflow-y-auto rounded-xl border p-2.5">
              {swatches.map((color) => {
                const on = color === active;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={on}
                    title={color}
                    onClick={() => pick(color)}
                    className={cn(
                      "size-6 snap-start scroll-mt-2.5 rounded-md ring-1 ring-black/10",
                      on && "ring-2 ring-pink-strong ring-offset-1",
                    )}
                    style={swatchStyle(color)}
                  />
                );
              })}
            </div>
          )}
          <Input
            aria-label="Hex colour"
            value={hex}
            maxLength={7}
            onChange={(e) => {
              const next = e.target.value.trim();
              setHex(next);
              if (/^#[0-9a-f]{6}$/i.test(next)) pick(next.toLowerCase());
            }}
            className="mt-3 h-10 w-full rounded-xl px-3 font-mono uppercase"
          />
        </div>

        <label className="flex items-center gap-3 text-sm">
          <span className="font-semibold">Tolerance</span>
          <input
            type="range"
            min={0}
            max={255}
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="min-w-0 flex-1 accent-pink-strong"
          />
          <NumericInput
            min={0}
            max={255}
            value={tolerance}
            onValueChange={(next) =>
              setTolerance(Math.min(255, Math.max(0, Math.round(next) || 0)))
            }
            className="h-10 w-16 rounded-xl border border-input bg-background px-2 text-center tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={keepShading}
            onChange={(e) => setKeepShading(e.target.checked)}
          />
          Keep shading of similar colours
        </label>
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
            : "No pixels match yet. Pick another colour or raise the tolerance."}
        </p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!changed && !allFrames}>
          Replace
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
