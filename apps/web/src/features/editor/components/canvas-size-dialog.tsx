"use client";

import { useState } from "react";
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
  ANCHORS,
  bordersFor,
  sameAnchor,
  type Anchor,
} from "@/lib/sprite/canvas-size";
import { LockSwitch, SIZE_LABEL, SizeField } from "./size-controls";

type Size = { w: number; h: number };

export default function CanvasSizeDialog({
  size,
  onApply,
  onClose,
}: {
  size: Size;
  onApply: (next: Size, offset: { x: number; y: number }) => void;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <ResizeForm size={size} onApply={onApply} />
    </Dialog>
  );
}

function ResizeForm({
  size,
  onApply,
}: {
  size: Size;
  onApply: (next: Size, offset: { x: number; y: number }) => void;
}) {
  const { close } = useDialog();
  const [width, setWidth] = useState(String(size.w));
  const [height, setHeight] = useState(String(size.h));
  const [locked, setLocked] = useState(true);
  const [anchor, setAnchor] = useState<Anchor>({ x: 0.5, y: 0.5 });

  const next = { w: Number(width) || 0, h: Number(height) || 0 };
  const problem =
    !Number.isInteger(next.w) || !Number.isInteger(next.h)
      ? "Use whole pixels."
      : next.w < MIN_SIZE || next.h < MIN_SIZE
        ? `The tile must be at least ${MIN_SIZE} × ${MIN_SIZE} px.`
        : next.w > MAX_SIZE || next.h > MAX_SIZE
          ? `The tile can be at most ${MAX_SIZE} × ${MAX_SIZE} px.`
          : null;
  const unchanged = next.w === size.w && next.h === size.h;

  const changeWidth = (text: string) => {
    setWidth(text);
    if (locked && Number(text) > 0)
      setHeight(
        String(Math.max(1, Math.round((Number(text) * size.h) / size.w))),
      );
  };
  const changeHeight = (text: string) => {
    setHeight(text);
    if (locked && Number(text) > 0)
      setWidth(
        String(Math.max(1, Math.round((Number(text) * size.w) / size.h))),
      );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (problem || unchanged) return;
        const borders = bordersFor(size, next, anchor);
        onApply(next, { x: borders.left, y: borders.top });
        close();
      }}
      className="flex min-h-0 flex-col"
    >
      <ModalHeader title="Resize Canvas" />
      <DialogBody className="grid gap-6 py-6">
        <div className="grid grid-cols-2 gap-4">
          <SizeField
            id="canvas-w"
            label="Width"
            value={width}
            unit="px"
            onChange={changeWidth}
          />
          <SizeField
            id="canvas-h"
            label="Height"
            value={height}
            unit="px"
            onChange={changeHeight}
          />
        </div>
        <LockSwitch
          label="Lock aspect ratio"
          on={locked}
          onChange={setLocked}
        />
        <fieldset>
          <legend className={SIZE_LABEL}>Anchor position</legend>
          <div className="grid w-fit grid-cols-3 gap-1.5 rounded-xl border p-1.5">
            {ANCHORS.map((cell) => {
              const on = sameAnchor(cell, anchor);
              return (
                <button
                  key={`${cell.x},${cell.y}`}
                  type="button"
                  aria-label={`Anchor at the ${anchorName(cell)}`}
                  title={`Anchor at the ${anchorName(cell)}`}
                  aria-pressed={on}
                  onClick={() => setAnchor(cell)}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg border transition-colors",
                    on
                      ? "border-primary-soft bg-pastel-pink-soft"
                      : "bg-background hover:bg-pink-base",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5",
                      on ? "bg-pink-strong" : "bg-[#9c6b7f]",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </fieldset>
        {problem && <FormMessage tone="error">{problem}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!!problem || unchanged}>
          Resize
        </ModalButton>
      </DialogFooter>
    </form>
  );
}

function anchorName({ x, y }: Anchor) {
  const across = x === 0 ? "left" : x === 1 ? "right" : "";
  const down = y === 0 ? "top" : y === 1 ? "bottom" : "";
  return across || down ? `${down} ${across}`.trim() : "centre";
}
