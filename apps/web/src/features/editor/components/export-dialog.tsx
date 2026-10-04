"use client";

import { useEffect, useRef, useState } from "react";
import { NumericInput } from "./numeric-input";
import { Button } from "@pigxel/ui/components/button";
import {
  Checkbox,
  ChoiceCard,
  ChoiceText,
  Radio,
} from "@pigxel/ui/components/choice";
import { FormMessage, Label } from "@pigxel/ui/components/field";
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@pigxel/ui/components/input";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import {
  EXPORT_FORMATS,
  MAX_EXPORT_SCALE,
  MAX_EXPORT_SIDE,
  MIN_EXPORT_SCALE,
  SHEET_LAYOUTS,
  TIMELAPSE_FPS,
  TIMELAPSE_LENGTHS,
  TIMELAPSE_SHAPES,
  TIMELAPSE_STYLES,
  type ExportSettings,
} from "../export/constants";
import {
  clampScale,
  exportFiles,
  exportSize,
  fitsCanvas,
  stretchedSource,
  type ExportSource,
} from "../export/export";
import { isSquare, type PixelRatio } from "@/lib/sprite/pixel-ratio";
import { saveExport } from "../export/save";
import { timelapseTiming } from "../export/timelapse";
import { renderTimelapse } from "../export/timelapse-video";
import { frameIndex } from "@/lib/sprite/frames";

function Options<T extends string | number>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-2 text-sm">
          <Radio
            name={name}
            className="mt-0"
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export default function ExportDialog({
  source: tile,
  pixelRatio,
  settings,
  onChange,
  onClose,
}: {
  source: ExportSource;
  pixelRatio?: PixelRatio;
  settings: ExportSettings;
  onChange: (settings: ExportSettings) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const rendering = useRef<AbortController | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
    return () => rendering.current?.abort();
  }, []);

  const set = (patch: Partial<ExportSettings>) => {
    setError(null);
    onChange({ ...settings, ...patch });
  };

  const stretch = !isSquare(pixelRatio) && settings.applyRatio;
  const source = stretch ? stretchedSource(tile, pixelRatio!) : tile;
  const { size, frames } = source;
  const animated = settings.format === "gif" || settings.format === "sheet";
  const timelapse = settings.format === "timelapse";
  const style = TIMELAPSE_STYLES.find((s) => s.id === settings.timelapseStyle)!;
  const seconds = Math.round(
    timelapseTiming(settings.timelapseLength).total / TIMELAPSE_FPS,
  );
  const output = exportSize(settings, size, frames.length, source.slices);
  const fits = fitsCanvas(output);
  const noSlices = settings.format === "slices" && !output.w;

  const run = async () => {
    setBusy(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve));
    try {
      if (timelapse) {
        rendering.current = new AbortController();
        setProgress(0);
        const video = await renderTimelapse(
          source,
          settings,
          (done) => setProgress(Math.floor(done * 100)),
          rendering.current.signal,
        );
        await saveExport([video]);
      } else await saveExport(exportFiles(source, settings));
      dialog.current?.close();
    } catch (e) {
      if (rendering.current?.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Couldn’t export the tile.");
      setBusy(false);
      setProgress(null);
    } finally {
      rendering.current = null;
    }
  };

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="export-dialog-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="export-dialog-title">Export</SectionTitle>
          <Lead className="mt-1">
            {size.w} × {size.h} px ·{" "}
            {frames.length === 1 ? "1 frame" : `${frames.length} frames`}
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
          void run();
        }}
      >
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Format</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {EXPORT_FORMATS.map((format) => (
              <ChoiceCard key={format.id} className="p-3">
                <Radio
                  name="export-format"
                  checked={settings.format === format.id}
                  onChange={() => set({ format: format.id })}
                />
                <ChoiceText title={format.label}>
                  {format.description}
                </ChoiceText>
              </ChoiceCard>
            ))}
          </div>
          {noSlices && (
            <FormMessage tone="error" className="text-xs">
              This tile has no slices yet. Mark parts of it with the Slice tool
              (C) first.
            </FormMessage>
          )}
          {!animated && frames.length > 1 && (
            <FormMessage className="text-xs">
              Exports frame {frameIndex(frames, source.frameId) + 1} of{" "}
              {frames.length}. GIF and Sprite sheet export every frame.
            </FormMessage>
          )}
        </fieldset>

        {settings.format === "sheet" && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Layout</legend>
            <Options
              name="export-layout"
              options={SHEET_LAYOUTS}
              value={settings.layout}
              onChange={(layout) => set({ layout })}
            />
            <label className="flex items-center gap-2 pt-1 text-sm">
              <Checkbox
                checked={settings.sheetData}
                onChange={(e) => set({ sheetData: e.target.checked })}
              />
              Also save JSON data (frame positions and durations, in Aseprite’s
              format)
            </label>
          </fieldset>
        )}

        {timelapse && (
          <>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">
                Drawing style
              </legend>
              <Options
                name="timelapse-style"
                options={TIMELAPSE_STYLES}
                value={settings.timelapseStyle}
                onChange={(timelapseStyle) => set({ timelapseStyle })}
              />
              <FormMessage className="text-xs">{style.description}</FormMessage>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Shape</legend>
                <Options
                  name="timelapse-shape"
                  options={TIMELAPSE_SHAPES}
                  value={settings.timelapseShape}
                  onChange={(timelapseShape) => set({ timelapseShape })}
                />
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">
                  Drawing time
                </legend>
                <Options
                  name="timelapse-length"
                  options={TIMELAPSE_LENGTHS.map((id) => ({
                    id,
                    label: `${id} s`,
                  }))}
                  value={settings.timelapseLength}
                  onChange={(timelapseLength) => set({ timelapseLength })}
                />
              </fieldset>
            </div>
            <FormMessage className="tabular-nums">
              {output.w} × {output.h} px · {seconds} s video, ending with the
              Pigxel logo
            </FormMessage>
          </>
        )}

        {!isSquare(pixelRatio) && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={settings.applyRatio}
              onChange={(e) => set({ applyRatio: e.target.checked })}
            />
            Stretch {pixelRatio!.w}:{pixelRatio!.h} pixels to their shape
          </label>
        )}

        {!timelapse && (
          <div className="space-y-1.5">
            <Label htmlFor="export-scale" className="block">
              Scale
            </Label>
            <div className="flex items-center gap-3">
              <InputGroup className="h-8 w-24">
                <NumericInput
                  as={InputGroupInput}
                  id="export-scale"
                  min={MIN_EXPORT_SCALE}
                  max={MAX_EXPORT_SCALE}
                  value={settings.scale}
                  onValueChange={(next) => set({ scale: clampScale(next) })}
                  aria-describedby="export-scale-hint"
                  className="px-2 tabular-nums"
                />
                <InputGroupText className="pr-2 pl-0">×</InputGroupText>
              </InputGroup>
              <FormMessage
                id="export-scale-hint"
                tone={fits ? "muted" : "error"}
                className="tabular-nums"
              >
                {settings.format === "slices" && "Largest "}
                {output.w} × {output.h} px
                {!fits &&
                  ` — too big; each side can be at most ${MAX_EXPORT_SIDE} px`}
              </FormMessage>
            </div>
          </div>
        )}

        {progress !== null && (
          <div
            role="progressbar"
            aria-label="Rendering the timelapse"
            aria-valuenow={progress}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !fits || noSlices}>
            {progress !== null
              ? `Rendering ${progress}%…`
              : busy
                ? "Exporting…"
                : "Export"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
