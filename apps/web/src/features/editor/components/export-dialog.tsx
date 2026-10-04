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
import { frameIndex } from "@/lib/sprite/frames";

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

  useEffect(() => dialog.current?.showModal(), []);

  const set = (patch: Partial<ExportSettings>) => {
    setError(null);
    onChange({ ...settings, ...patch });
  };

  const stretch = !isSquare(pixelRatio) && settings.applyRatio;
  const source = stretch ? stretchedSource(tile, pixelRatio!) : tile;
  const { size, frames } = source;
  const animated = settings.format === "gif" || settings.format === "sheet";
  const output = exportSize(settings, size, frames.length, source.slices);
  const fits = fitsCanvas(output);
  const noSlices = settings.format === "slices" && !output.w;

  const run = async () => {
    setBusy(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve));
    try {
      await saveExport(exportFiles(source, settings));
      dialog.current?.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t export the tile.");
      setBusy(false);
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
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {SHEET_LAYOUTS.map((layout) => (
                <label
                  key={layout.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Radio
                    name="export-layout"
                    className="mt-0"
                    checked={settings.layout === layout.id}
                    onChange={() => set({ layout: layout.id })}
                  />
                  {layout.label}
                </label>
              ))}
            </div>
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

        {!isSquare(pixelRatio) && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={settings.applyRatio}
              onChange={(e) => set({ applyRatio: e.target.checked })}
            />
            Stretch {pixelRatio!.w}:{pixelRatio!.h} pixels to their shape
          </label>
        )}

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
            {busy ? "Exporting…" : "Export"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
