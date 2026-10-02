"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import { FormMessage, Label } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import type { DecodedAnimation } from "@/lib/image/gif-decode";
import {
  cutSheet,
  guessSheetGrid,
  sheetCells,
  sheetGridProblem,
  type Picture,
  type SheetGrid,
} from "@/lib/pigxel-file/import-sheet";
import { MAX_FRAME_DURATION, MIN_FRAME_DURATION } from "@/lib/sprite/constants";

/** The largest the preview of the sheet is drawn, in screen pixels. */
const PREVIEW = { w: 480, h: 240 };

const FIELDS: { key: keyof SheetGrid; label: string; min: number }[] = [
  { key: "frameW", label: "Frame width", min: 1 },
  { key: "frameH", label: "Frame height", min: 1 },
  { key: "offsetX", label: "Offset X", min: 0 },
  { key: "offsetY", label: "Offset Y", min: 0 },
  { key: "gapX", label: "Gap X", min: 0 },
  { key: "gapY", label: "Gap Y", min: 0 },
];

/**
 * Cuts a sprite sheet into the frames of a new tile: the grid (frame size,
 * offset, gaps) is guessed, shown over the picture and can be changed.
 */
export default function ImportSheetDialog({
  name,
  picture,
  scale,
  onImport,
  onClose,
}: {
  /** The sheet's file name, without its extension. */
  name: string;
  picture: Picture;
  /** How much the file was enlarged; the picture is already back at its own size. */
  scale: number;
  onImport: (frames: DecodedAnimation) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState(() => guessSheetGrid(picture));
  useEffect(() => dialog.current?.showModal(), []);

  const cells = sheetCells(grid, picture.w, picture.h);
  const cut = useMemo(() => cutSheet(picture, grid), [picture, grid]);
  const problem =
    sheetGridProblem(grid, picture.w, picture.h) ??
    (cut.frames.length
      ? null
      : "Every frame is empty. Untick “Skip empty frames” to keep them.");
  // Whole screen pixels per sheet pixel when it fits, smaller for big sheets.
  const fit = Math.min(PREVIEW.w / picture.w, PREVIEW.h / picture.h);
  const zoom = fit >= 1 ? Math.floor(fit) : fit;

  useEffect(() => {
    const ctx = preview.current?.getContext("2d");
    if (!ctx) return;
    const source = document.createElement("canvas");
    source.width = picture.w;
    source.height = picture.h;
    source
      .getContext("2d")
      ?.putImageData(
        new ImageData(
          new Uint8ClampedArray(picture.rgba),
          picture.w,
          picture.h,
        ),
        0,
        0,
      );
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(source, 0, 0, picture.w * zoom, picture.h * zoom);
  }, [picture, zoom]);

  const set = (key: keyof SheetGrid, value: number | boolean) =>
    setGrid((g) => ({ ...g, [key]: value }));

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="sheet-dialog-title"
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 border-b p-5">
        <div>
          <SectionTitle id="sheet-dialog-title">
            Import sprite sheet
          </SectionTitle>
          <Lead className="mt-1">
            {name} · {picture.w} × {picture.h} px
            {scale > 1 && ` (saved at ${scale}×, read at its own size)`}
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
          if (problem) return;
          onImport(cut);
          dialog.current?.close();
        }}
      >
        <div className="flex justify-center overflow-hidden rounded-lg border bg-muted p-3">
          <div
            className="relative bg-checker"
            style={{ width: picture.w * zoom, height: picture.h * zoom }}
          >
            <canvas
              ref={preview}
              width={Math.ceil(picture.w * zoom)}
              height={Math.ceil(picture.h * zoom)}
              aria-label="The sprite sheet with the frames it is cut into"
              className="block"
            />
            {cells.map((cell, i) => (
              <span
                key={`${cell.x},${cell.y}`}
                className="pointer-events-none absolute border border-blue-500/80 text-[10px] leading-none text-blue-600"
                style={{
                  left: cell.x * zoom,
                  top: cell.y * zoom,
                  width: cell.w * zoom,
                  height: cell.h * zoom,
                }}
              >
                {cell.w * zoom >= 18 && (
                  <span className="bg-background/80 px-0.5">{i + 1}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {FIELDS.map(({ key, label, min }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`sheet-${key}`} className="block text-xs">
                {label}
              </Label>
              <Input
                id={`sheet-${key}`}
                type="number"
                inputSize="sm"
                min={min}
                value={grid[key] as number}
                onChange={(e) =>
                  set(
                    key,
                    Math.max(min, Math.round(Number(e.target.value)) || min),
                  )
                }
                className="tabular-nums"
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="sheet-duration" className="block text-xs">
              Frame duration, ms
            </Label>
            <Input
              id="sheet-duration"
              type="number"
              inputSize="sm"
              min={MIN_FRAME_DURATION}
              max={MAX_FRAME_DURATION}
              value={grid.duration}
              onChange={(e) =>
                set(
                  "duration",
                  Math.max(
                    MIN_FRAME_DURATION,
                    Math.min(
                      MAX_FRAME_DURATION,
                      Math.round(Number(e.target.value)) || MIN_FRAME_DURATION,
                    ),
                  ),
                )
              }
              className="tabular-nums"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={grid.skipEmpty}
            onChange={(e) => set("skipEmpty", e.target.checked)}
          />
          Skip empty frames
        </label>

        <FormMessage
          tone={problem ? "error" : "muted"}
          className="tabular-nums"
        >
          {problem ??
            `${cut.frames.length} ${cut.frames.length === 1 ? "frame" : "frames"} of ${grid.frameW} × ${grid.frameH} px`}
        </FormMessage>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!!problem}>
            Import as new tile
          </Button>
        </div>
      </form>
    </dialog>
  );
}
