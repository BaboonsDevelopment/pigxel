"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NumericInput } from "./numeric-input";
import { Checkbox } from "@pigxel/ui/components/choice";
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
import {
  EXPORT_FORMATS,
  MAX_EXPORT_SCALE,
  MAX_EXPORT_SIDE,
  MIN_EXPORT_SCALE,
  MAX_SHEET_PADDING,
  SHEET_JSONS,
  SHEET_LAYOUTS,
  SHEET_SPLITS,
  TIMELAPSE_FPS,
  TIMELAPSE_LENGTHS,
  TIMELAPSE_SHAPES,
  TIMELAPSE_STYLES,
  type ExportSettings,
} from "../export/constants";
import {
  clampScale,
  exactSheetSize,
  exportFiles,
  exportSize,
  fitsCanvas,
  partialSource,
  stretchedSource,
  type ExportSource,
} from "../export/export";
import { isSquare, type PixelRatio } from "@/lib/sprite/pixel-ratio";
import { saveExport } from "../export/save";
import { timelapseTiming } from "../export/timelapse";
import { renderTimelapse } from "../export/timelapse-video";
import { frameIndex } from "@/lib/sprite/frames";
import { EditorSelect } from "./editor-select";
import { SIZE_LABEL } from "./size-controls";
import { showLoading, showSuccess } from "@/components/ui/snackbar";

const NUMBER_FIELD =
  "h-12 w-full rounded-xl border border-input bg-background px-4 pr-10 text-base tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const UNIT =
  "pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground";

const HINT = "mt-2 text-xs text-muted-foreground";

const CHECK = "flex items-center gap-2 text-sm";

const option = (on: boolean) =>
  cn(
    "h-11 rounded-xl border px-3 text-sm transition-colors",
    on
      ? "border-primary-soft bg-pastel-pink-soft font-semibold"
      : "bg-background hover:bg-pink-base",
  );

function Options<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={value === item.id}
          onClick={() => onChange(item.id)}
          className={option(value === item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

type ExportProps = {
  source: ExportSource;
  pixelRatio?: PixelRatio;
  settings: ExportSettings;
  onChange: (settings: ExportSettings) => void;
};

export default function ExportDialog({
  onClose,
  ...props
}: ExportProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="md" portal>
      <ExportForm {...props} />
    </Dialog>
  );
}

function ExportForm({
  source: tile,
  pixelRatio,
  settings,
  onChange,
}: ExportProps) {
  const { close } = useDialog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const rendering = useRef<AbortController | null>(null);

  useEffect(() => () => rendering.current?.abort(), []);

  const set = (patch: Partial<ExportSettings>) => {
    setError(null);
    onChange({ ...settings, ...patch });
  };

  const stretch = !isSquare(pixelRatio) && settings.applyRatio;
  const animated = ["gif", "apng", "webp", "frames", "sheet"].includes(
    settings.format,
  );
  const timelapse = settings.format === "timelapse";
  const part = timelapse
    ? tile
    : partialSource(tile, animated ? settings : { ...settings, partTag: null });
  const source = stretch ? stretchedSource(part, pixelRatio!) : part;
  const chosenLayers = settings.partLayers ?? [];
  const noLayers = !timelapse && !!settings.partLayers && !chosenLayers.length;
  const { size, frames } = source;
  const style = TIMELAPSE_STYLES.find((s) => s.id === settings.timelapseStyle)!;
  const format = EXPORT_FORMATS.find((f) => f.id === settings.format);
  const seconds = Math.round(
    timelapseTiming(settings.timelapseLength).total / TIMELAPSE_FPS,
  );
  const sheetOutput = useMemo(
    () =>
      settings.format === "sheet" ? exactSheetSize(source, settings) : null,
    [source, settings],
  );
  const output =
    sheetOutput ?? exportSize(settings, size, frames.length, source.slices);
  const fits = fitsCanvas(output);
  const noSlices = settings.format === "slices" && !output.w;

  const run = async () => {
    setBusy(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve));
    const loading = showLoading("Exporting…");
    try {
      if (timelapse) {
        rendering.current = new AbortController();
        setProgress(0);
        const video = await renderTimelapse(
          source,
          settings,
          (done) => {
            setProgress(Math.floor(done * 100));
            loading.progress(done);
          },
          rendering.current.signal,
        );
        await saveExport([video]);
      } else await saveExport(exportFiles(source, settings));
      showSuccess("Export complete!");
      close();
    } catch (e) {
      if (rendering.current?.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Couldn’t export the tile.");
      setBusy(false);
      setProgress(null);
    } finally {
      loading.close();
      rendering.current = null;
    }
  };

  return (
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <ModalHeader title="Export Project" />
      <DialogBody className="grid gap-6 py-5">
        <p className="-mb-2 text-sm text-muted-foreground tabular-nums">
          {size.w} × {size.h} px ·{" "}
          {frames.length === 1 ? "1 frame" : `${frames.length} frames`}
        </p>

        <fieldset>
          <legend className={SIZE_LABEL}>Format</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {EXPORT_FORMATS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={settings.format === item.id}
                onClick={() => set({ format: item.id })}
                className={option(settings.format === item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {format && <p className={HINT}>{format.description}</p>}
          {noLayers && (
            <FormMessage tone="error" className="mt-2 text-xs">
              Pick at least one layer under Export only.
            </FormMessage>
          )}
          {noSlices && (
            <FormMessage tone="error" className="mt-2 text-xs">
              This tile has no slices yet. Mark parts of it with the Slice tool
              (C) first.
            </FormMessage>
          )}
          {!animated && frames.length > 1 && (
            <p className={HINT}>
              Exports frame {frameIndex(frames, source.frameId) + 1} of{" "}
              {frames.length}. GIF, Animated PNG, Animated WebP, PNG sequence
              and Sprite sheet export every frame.
            </p>
          )}
        </fieldset>

        {!timelapse && (
          <div>
            <label htmlFor="export-scale" className={SIZE_LABEL}>
              Scale
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-32 shrink-0">
                <NumericInput
                  id="export-scale"
                  min={MIN_EXPORT_SCALE}
                  max={MAX_EXPORT_SCALE}
                  value={settings.scale}
                  onValueChange={(next) => set({ scale: clampScale(next) })}
                  aria-describedby="export-scale-hint"
                  className={NUMBER_FIELD}
                />
                <span className={UNIT}>×</span>
              </div>
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

        {!timelapse && (
          <fieldset className="grid gap-2">
            <legend className={SIZE_LABEL}>Export only</legend>
            {tile.selection && (
              <label className={CHECK}>
                <Checkbox
                  checked={settings.partSelection}
                  onChange={(e) => set({ partSelection: e.target.checked })}
                />
                The selection, cut to its size
              </label>
            )}
            {(tile.layers?.length ?? 0) > 1 && (
              <div className="grid gap-2">
                <label className={CHECK}>
                  <Checkbox
                    checked={!!settings.partLayers}
                    onChange={(e) =>
                      set({
                        partLayers: e.target.checked
                          ? (tile.layers ?? []).map((layer) => layer.id)
                          : null,
                      })
                    }
                  />
                  These layers:
                </label>
                {settings.partLayers && (
                  <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border bg-background p-3">
                    {tile.layers!.map((layer) => (
                      <label key={layer.id} className={CHECK}>
                        <Checkbox
                          checked={chosenLayers.includes(layer.id)}
                          onChange={(e) =>
                            set({
                              partLayers: e.target.checked
                                ? [...chosenLayers, layer.id]
                                : chosenLayers.filter((id) => id !== layer.id),
                            })
                          }
                        />
                        {layer.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            {animated && !!tile.tags?.length && (
              <div>
                <span className="mb-1.5 block text-sm">Frames</span>
                <EditorSelect
                  ariaLabel="Frames to export"
                  value={settings.partTag ?? ""}
                  onChange={(value) => set({ partTag: value || null })}
                  options={[
                    { value: "", label: "All frames" },
                    ...tile.tags.map((tag) => ({
                      value: tag.id,
                      label: `${tag.name} (${tag.from + 1}–${tag.to + 1})`,
                    })),
                  ]}
                  className="h-12 w-full rounded-xl px-4 text-base"
                />
              </div>
            )}
            {!tile.selection &&
              (tile.layers?.length ?? 0) < 2 &&
              !(animated && tile.tags?.length) && (
                <p className="text-xs text-muted-foreground">
                  Select an area, add layers or tag frames to export just a
                  part.
                </p>
              )}
          </fieldset>
        )}

        {settings.format === "sheet" && (
          <fieldset className="grid gap-4">
            <legend className={SIZE_LABEL}>Sprite sheet</legend>
            <div>
              <span className="mb-1.5 block text-sm">Layout</span>
              <Options
                label="Layout"
                options={SHEET_LAYOUTS}
                value={settings.layout}
                onChange={(layout) => set({ layout })}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-sm">Frames</span>
              <Options
                label="Frames"
                options={SHEET_SPLITS.filter(
                  (item) =>
                    item.id === "none" ||
                    (item.id === "layers"
                      ? (source.layers?.length ?? 0) > 1
                      : !!source.tags?.length),
                )}
                value={settings.sheetSplit}
                onChange={(sheetSplit) => set({ sheetSplit })}
              />
              {settings.sheetSplit !== "none" && (
                <p className={HINT}>
                  {settings.sheetSplit === "layers"
                    ? "Every layer gets its own frames, each on its own row in Row or Column layout."
                    : "Only frames inside tags are saved, each tag on its own row in Row or Column layout."}
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  [
                    "sheetBorder",
                    "Border",
                    "Empty space around the whole sheet",
                  ],
                  ["sheetSpacing", "Spacing", "Empty space between frames"],
                  [
                    "sheetInner",
                    "Inner",
                    "Empty space inside each frame’s cell",
                  ],
                ] as const
              ).map(([key, label, hint]) => (
                <label key={key} className="block text-sm" title={hint}>
                  <span className="mb-1.5 block">{label}</span>
                  <span className="relative block">
                    <NumericInput
                      min={0}
                      max={MAX_SHEET_PADDING}
                      value={settings[key]}
                      onValueChange={(next) =>
                        set({
                          [key]: Math.min(
                            MAX_SHEET_PADDING,
                            Math.max(0, Math.round(next) || 0),
                          ),
                        })
                      }
                      className={NUMBER_FIELD}
                    />
                    <span className={UNIT}>px</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="grid gap-2">
              <label className={CHECK}>
                <Checkbox
                  checked={settings.sheetTrim}
                  onChange={(e) => set({ sheetTrim: e.target.checked })}
                />
                Trim empty edges of each frame
              </label>
              <label className={CHECK}>
                <Checkbox
                  checked={settings.sheetMerge}
                  onChange={(e) => set({ sheetMerge: e.target.checked })}
                />
                Save identical frames once
              </label>
              <label className={CHECK}>
                <Checkbox
                  checked={settings.sheetSkipEmpty}
                  onChange={(e) => set({ sheetSkipEmpty: e.target.checked })}
                />
                Leave out empty frames
              </label>
              <label className={CHECK}>
                <Checkbox
                  checked={settings.sheetData}
                  onChange={(e) => set({ sheetData: e.target.checked })}
                />
                Also save JSON data (frame positions and durations, in
                Aseprite’s format)
              </label>
            </div>
            {settings.sheetData && (
              <div>
                <span className="mb-1.5 block text-sm">JSON frames as</span>
                <Options
                  label="JSON frames as"
                  options={SHEET_JSONS}
                  value={settings.sheetJson}
                  onChange={(sheetJson) => set({ sheetJson })}
                />
              </div>
            )}
          </fieldset>
        )}

        {timelapse && (
          <>
            <fieldset>
              <legend className={SIZE_LABEL}>Drawing style</legend>
              <Options
                label="Drawing style"
                options={TIMELAPSE_STYLES}
                value={settings.timelapseStyle}
                onChange={(timelapseStyle) => set({ timelapseStyle })}
              />
              <p className={HINT}>{style.description}</p>
            </fieldset>
            <fieldset>
              <legend className={SIZE_LABEL}>Shape</legend>
              <Options
                label="Shape"
                options={TIMELAPSE_SHAPES}
                value={settings.timelapseShape}
                onChange={(timelapseShape) => set({ timelapseShape })}
              />
            </fieldset>
            <fieldset>
              <legend className={SIZE_LABEL}>Drawing time</legend>
              <Options
                label="Drawing time"
                options={TIMELAPSE_LENGTHS.map((id) => ({
                  id,
                  label: `${id} s`,
                }))}
                value={settings.timelapseLength}
                onChange={(timelapseLength) => set({ timelapseLength })}
              />
              <p className={cn(HINT, "tabular-nums")}>
                {output.w} × {output.h} px · {seconds} s video, ending with the
                Pigxel logo
              </p>
            </fieldset>
          </>
        )}

        {!isSquare(pixelRatio) && (
          <label className={CHECK}>
            <Checkbox
              checked={settings.applyRatio}
              onChange={(e) => set({ applyRatio: e.target.checked })}
            />
            Stretch {pixelRatio!.w}:{pixelRatio!.h} pixels to their shape
          </label>
        )}

        {progress !== null && (
          <div
            role="progressbar"
            aria-label="Rendering the timelapse"
            aria-valuenow={progress}
            className="h-1.5 overflow-hidden rounded-full bg-progress-track"
          >
            <div
              className="h-full bg-progress-fill transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton
          type="submit"
          disabled={busy || !fits || noSlices || noLayers}
        >
          {progress !== null
            ? `Rendering ${progress}%…`
            : busy
              ? "Exporting…"
              : "Export"}
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
