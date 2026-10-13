"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@pigxel/ui/components/choice";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { cn } from "@pigxel/ui/lib/utils";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { NumericInput } from "./numeric-input";
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

const PREVIEW = { w: 480, h: 240 };

const FIELDS: { key: keyof SheetGrid; label: string; min: number }[] = [
  { key: "frameW", label: "Frame width", min: 1 },
  { key: "frameH", label: "Frame height", min: 1 },
  { key: "offsetX", label: "Offset X", min: 0 },
  { key: "offsetY", label: "Offset Y", min: 0 },
  { key: "gapX", label: "Gap X", min: 0 },
  { key: "gapY", label: "Gap Y", min: 0 },
];

const FIELD_LABEL = "mb-1.5 block text-sm font-semibold";

const NUMBER_FIELD =
  "h-12 w-full rounded-xl border border-input bg-background px-4 pr-11 text-base tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const UNIT =
  "pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground";

type SheetProps = {
  name: string;
  picture: Picture;
  scale: number;
  onImport: (frames: DecodedAnimation) => void;
};

export default function ImportSheetDialog({
  onClose,
  ...props
}: SheetProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="md" portal>
      <SheetForm {...props} />
    </Dialog>
  );
}

function SheetForm({ name, picture, scale, onImport }: SheetProps) {
  const { close } = useDialog();
  const preview = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState(() => guessSheetGrid(picture));

  const cells = sheetCells(grid, picture.w, picture.h);
  const cut = useMemo(() => cutSheet(picture, grid), [picture, grid]);
  const problem =
    sheetGridProblem(grid, picture.w, picture.h) ??
    (cut.frames.length
      ? null
      : "Every frame is empty. Untick “Skip empty frames” to keep them.");
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
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (problem) return;
        onImport(cut);
        close();
      }}
    >
      <ModalHeader title="Import Sprite Sheet" />
      <DialogBody className="grid gap-5 py-5">
        <p className="-mb-1 truncate text-sm text-muted-foreground tabular-nums">
          {name} · {picture.w} × {picture.h} px
          {scale > 1 && ` (saved at ${scale}×, read at its own size)`}
        </p>

        <div className="flex justify-center overflow-hidden rounded-xl border bg-background p-3">
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
                className="pointer-events-none absolute border border-pink-strong/80 text-[10px] leading-none text-pink-strong"
                style={{
                  left: cell.x * zoom,
                  top: cell.y * zoom,
                  width: cell.w * zoom,
                  height: cell.h * zoom,
                }}
              >
                {cell.w * zoom >= 18 && (
                  <span className="rounded-br bg-background/85 px-0.5">
                    {i + 1}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {FIELDS.map(({ key, label, min }) => (
            <label key={key} className="block">
              <span className={FIELD_LABEL}>{label}</span>
              <span className="relative block">
                <NumericInput
                  min={min}
                  value={grid[key] as number}
                  onValueChange={(next) =>
                    set(key, Math.max(min, Math.round(next) || min))
                  }
                  className={NUMBER_FIELD}
                />
                <span className={UNIT}>px</span>
              </span>
            </label>
          ))}
          <label className="block">
            <span className={FIELD_LABEL}>Frame duration</span>
            <span className="relative block">
              <NumericInput
                min={MIN_FRAME_DURATION}
                max={MAX_FRAME_DURATION}
                value={grid.duration}
                onValueChange={(next) =>
                  set(
                    "duration",
                    Math.max(
                      MIN_FRAME_DURATION,
                      Math.min(
                        MAX_FRAME_DURATION,
                        Math.round(next) || MIN_FRAME_DURATION,
                      ),
                    ),
                  )
                }
                className={NUMBER_FIELD}
              />
              <span className={UNIT}>ms</span>
            </span>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={grid.skipEmpty}
            onChange={(e) => set("skipEmpty", e.target.checked)}
          />
          Skip empty frames
        </label>

        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm tabular-nums",
            problem ? "bg-attention-soft" : "bg-success-soft",
          )}
        >
          {problem ??
            `${cut.frames.length} ${cut.frames.length === 1 ? "frame" : "frames"} of ${grid.frameW} × ${grid.frameH} px`}
        </p>
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!!problem}>
          Import as new tile
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
