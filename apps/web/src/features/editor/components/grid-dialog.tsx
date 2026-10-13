"use client";

import { useEffect, useRef, useState } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { ModalButton } from "@/components/ui/modal-button";
import { ModalHeader } from "@/components/ui/modal-header";
import {
  DEFAULT_GRID_LOOK,
  MAX_GRID,
  squareGrid,
  type CanvasGrid,
  type GridLook,
} from "../pixel-canvas/view";
import { SIZE_LABEL, SizeField } from "./size-controls";

export default function GridDialog({
  grid: initialGrid,
  look: initialLook,
  onChange,
  onClose,
}: {
  grid: CanvasGrid | null;
  look: GridLook;
  onChange: (grid: CanvasGrid | null, look: GridLook) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [grid, setGrid] = useState(initialGrid ?? squareGrid(16));
  const [look, setLook] = useState(initialLook);
  const [hex, setHex] = useState(initialLook.color);
  const kept = useRef(true);
  useEffect(() => dialog.current?.showModal(), []);
  const valid =
    [grid.w, grid.h].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= MAX_GRID,
    ) && [grid.x, grid.y].every(Number.isInteger);

  const show = (next: CanvasGrid, nextLook = look) => {
    setGrid(next);
    setLook(nextLook);
    if ([next.w, next.h].every((n) => n >= 1 && n <= MAX_GRID))
      onChange(next, nextLook);
  };
  const recolor = (color: string) => {
    setHex(color);
    show(grid, { ...look, color });
  };
  const cancel = () => {
    kept.current = false;
    dialog.current?.close();
  };

  return (
    <dialog
      ref={dialog}
      onClose={() => {
        if (!kept.current) onChange(initialGrid, initialLook);
        onClose();
      }}
      onCancel={() => {
        kept.current = false;
      }}
      aria-labelledby="grid-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-transparent"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onChange(grid, look);
          dialog.current?.close();
        }}
      >
        <ModalHeader title="Grid" titleId="grid-title" onClose={cancel} />

        <div className="grid gap-5 p-5">
          <div className="grid grid-cols-2 gap-4">
            <SizeField
              id="grid-width"
              label="Width"
              unit="px"
              value={String(grid.w)}
              onChange={(text) => show({ ...grid, w: Number(text) })}
            />
            <SizeField
              id="grid-height"
              label="Height"
              unit="px"
              value={String(grid.h)}
              onChange={(text) => show({ ...grid, h: Number(text) })}
            />
            <SizeField
              id="grid-x"
              label="Shift right"
              unit="px"
              min={null}
              value={String(grid.x)}
              onChange={(text) => show({ ...grid, x: Number(text) })}
            />
            <SizeField
              id="grid-y"
              label="Shift down"
              unit="px"
              min={null}
              value={String(grid.y)}
              onChange={(text) => show({ ...grid, y: Number(text) })}
            />
          </div>

          <div>
            <span className={SIZE_LABEL}>Colour</span>
            <div className="flex items-center gap-2">
              <label
                title="Pick a colour"
                className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-black/10"
              >
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: look.color }}
                />
                <input
                  type="color"
                  aria-label="Grid colour"
                  value={look.color}
                  onChange={(e) => recolor(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <Input
                aria-label="Hex colour"
                value={hex}
                maxLength={7}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  setHex(next);
                  if (/^#[0-9a-f]{6}$/i.test(next))
                    show(grid, { ...look, color: next.toLowerCase() });
                }}
                className="h-10 w-full rounded-xl px-3 font-mono uppercase"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <span className="w-16 font-semibold">Opacity</span>
            <input
              type="range"
              aria-label="Grid opacity"
              min={10}
              max={100}
              value={look.opacity}
              onChange={(e) =>
                show(grid, { ...look, opacity: Number(e.target.value) })
              }
              className="min-w-0 flex-1 accent-pink-strong"
            />
            <span className="w-10 text-right tabular-nums">
              {look.opacity}%
            </span>
          </label>

          {!valid && (
            <FormMessage tone="error">
              Width and height must be between 1 and {MAX_GRID} px.
            </FormMessage>
          )}
        </div>

        <div className="flex items-center gap-2 border-t bg-pink-base px-5 py-4">
          <button
            type="button"
            onClick={() => {
              setHex(DEFAULT_GRID_LOOK.color);
              show(squareGrid(16), DEFAULT_GRID_LOOK);
            }}
            className="mr-auto text-xs text-link-accent transition-colors hover:text-lavender-foreground"
          >
            Reset
          </button>
          <ModalButton variant="secondary" onClick={cancel}>
            Cancel
          </ModalButton>
          <ModalButton type="submit" disabled={!valid}>
            Done
          </ModalButton>
        </div>
      </form>
    </dialog>
  );
}
