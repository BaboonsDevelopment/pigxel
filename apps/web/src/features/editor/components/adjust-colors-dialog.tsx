"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NumericInput } from "./numeric-input";
import { cn } from "@pigxel/ui/lib/utils";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import {
  CONVOLUTIONS,
  CURVE_CHANNELS,
  STRAIGHT_CHANNELS,
  STRAIGHT_CURVE,
  type CurveChannel,
  adjustedColors,
  type AdjustKind,
  type AdjustSettings,
} from "../pixel-canvas/effects";
import { CurveEditor } from "./curve-editor";
import { MatrixEditor } from "./matrix-editor";
import { AllFramesOption } from "./all-frames-option";
import { inColorMode, type ColorMode } from "@/lib/palette/color-mode";

type Size = { w: number; h: number };

const CHANNEL_LABELS = {
  rgb: "RGB",
  red: "Red",
  green: "Green",
  blue: "Blue",
};

const CHANNEL_TONES = {
  rgb: "text-pink-strong",
  red: "text-[#d9626b]",
  green: "text-[#4f9e72]",
  blue: "text-[#5a7fd6]",
};

const CHANNEL_DOTS = {
  rgb: "conic-gradient(#ee8a91 0 33.3%, #7cc69c 0 66.6%, #8aa8ec 0)",
  red: "#ee8a91",
  green: "#7cc69c",
  blue: "#8aa8ec",
};

const CHANNEL_LIGHTS = {
  rgb: "#ffffff",
  red: "#ee8a91",
  green: "#7cc69c",
  blue: "#8aa8ec",
};

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
  curve: "Colour Curve",
  convolution: "Convolution Matrix",
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

type AdjustProps = {
  kind: AdjustKind;
  size: Size;
  pixels: Uint8ClampedArray;
  mask: Uint8Array | null;
  frameCount: number;
  colorMode: ColorMode;
  palette: string[];
  onApply: (settings: AdjustSettings, allFrames: boolean) => void;
};

export default function AdjustColorsDialog({
  onClose,
  ...props
}: AdjustProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="md" portal>
      <AdjustForm {...props} />
    </Dialog>
  );
}

function AdjustForm({
  kind,
  size,
  pixels,
  mask,
  frameCount,
  colorMode,
  palette,
  onApply,
}: AdjustProps) {
  const { close } = useDialog();
  const preview = useRef<HTMLCanvasElement>(null);
  const [values, setValues] = useState(() => initialValues(kind));
  const [curve, setCurve] = useState(STRAIGHT_CURVE);
  const [channels, setChannels] = useState(STRAIGHT_CHANNELS);
  const [channel, setChannel] = useState<CurveChannel | "rgb">("rgb");
  const [matrix, setMatrix] = useState(FIRST.matrix);
  const [allFrames, setAllFrames] = useState(false);

  const result = useMemo(() => {
    const out = adjustedColors(kind, pixels, mask, size, {
      values,
      curve,
      channels,
      matrix,
    });
    return inColorMode(out, colorMode, palette) ?? out;
  }, [
    kind,
    pixels,
    mask,
    size,
    values,
    curve,
    channels,
    matrix,
    colorMode,
    palette,
  ]);
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
    channels === STRAIGHT_CHANNELS &&
    matrix === FIRST.matrix &&
    SLIDERS[kind].every(({ key, initial }) => values[key] === initial);
  const applicable = changed > 0 || (allFrames && !untouched);
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
        if (!applicable) return;
        onApply({ values, curve, channels, matrix }, allFrames);
        close();
      }}
    >
      <ModalHeader title={TITLES[kind]} />
      <DialogBody className="grid gap-5 py-5">
        <div className="flex min-h-24 justify-center overflow-hidden rounded-xl border bg-background p-3">
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
          <div className="grid justify-items-center gap-3">
            <div
              role="group"
              aria-label="Channel"
              className="grid w-full grid-cols-4 gap-2"
            >
              {(["rgb", ...CURVE_CHANNELS] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={channel === option}
                  onClick={() => setChannel(option)}
                  className={cn(
                    "h-11 rounded-xl border text-sm transition-colors",
                    channel === option
                      ? "border-primary-soft bg-pastel-pink-soft font-semibold"
                      : "bg-background hover:bg-pink-base",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-3.5 rounded-full ring-1 ring-black/10"
                      style={{ background: CHANNEL_DOTS[option] }}
                    />
                    {CHANNEL_LABELS[option]}
                  </span>
                </button>
              ))}
            </div>
            <div
              className={cn(
                "flex w-full justify-center rounded-xl border p-4",
                CHANNEL_TONES[channel],
              )}
            >
              <CurveEditor
                key={channel}
                light={CHANNEL_LIGHTS[channel]}
                points={channel === "rgb" ? curve : channels[channel]}
                onChange={(points) =>
                  channel === "rgb"
                    ? setCurve(points)
                    : setChannels((c) => ({ ...c, [channel]: points }))
                }
              />
            </div>
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

        {SLIDERS[kind].length > 0 && (
          <div className="grid gap-3">
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
                  <span className="w-24 font-semibold">{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => set(Number(e.target.value))}
                    onDoubleClick={() => set(initial)}
                    className="min-w-0 flex-1 accent-pink-strong"
                  />
                  <NumericInput
                    min={min}
                    max={max}
                    value={value}
                    onValueChange={set}
                    className="h-10 w-16 rounded-xl border border-input bg-background px-2 text-center tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                  />
                </label>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground tabular-nums">
          {HINTS[kind]}{" "}
          {changed
            ? `${changed} ${changed === 1 ? "pixel changes" : "pixels change"}.`
            : untouched
              ? "Nothing changes yet."
              : mask
                ? "Nothing changes: the selection has no pixels on this layer. Deselect to adjust the whole layer."
                : "Nothing changes in this frame."}
        </p>
        <AllFramesOption
          frameCount={frameCount}
          checked={allFrames}
          onChange={setAllFrames}
        />
      </DialogBody>
      <DialogFooter className={cn(MODAL_FOOTER, "items-center")}>
        <button
          type="button"
          disabled={untouched}
          onClick={() => {
            setValues(initialValues(kind));
            setCurve(STRAIGHT_CURVE);
            setChannels(STRAIGHT_CHANNELS);
            setMatrix(FIRST.matrix);
          }}
          className="mr-auto text-xs text-link-accent transition-colors hover:text-lavender-foreground disabled:opacity-50"
        >
          Reset
        </button>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!applicable}>
          Apply
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
