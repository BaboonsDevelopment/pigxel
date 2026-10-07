"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import {
  DEFAULT_GRID_LOOK,
  MAX_GRID,
  squareGrid,
  type CanvasGrid,
  type GridLook,
} from "../pixel-canvas/view";
import { NumberField } from "./number-field";

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
      className="m-auto mr-4 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-transparent"
    >
      <form
        className="space-y-5 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onChange(grid, look);
          dialog.current?.close();
        }}
      >
        <div>
          <SectionTitle id="grid-title">Grid</SectionTitle>
          <Lead className="mt-1">Changes show on the canvas right away.</Lead>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="grid-width"
            label="Width, px"
            value={grid.w}
            onChange={(w) => show({ ...grid, w })}
          />
          <NumberField
            id="grid-height"
            label="Height, px"
            value={grid.h}
            onChange={(h) => show({ ...grid, h })}
          />
          <NumberField
            id="grid-x"
            label="Shift right, px"
            value={grid.x}
            onChange={(x) => show({ ...grid, x })}
          />
          <NumberField
            id="grid-y"
            label="Shift down, px"
            value={grid.y}
            onChange={(y) => show({ ...grid, y })}
          />
        </div>

        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Grid colour"
              value={look.color}
              onChange={(e) => show(grid, { ...look, color: e.target.value })}
              className="h-7 w-9 cursor-pointer rounded border bg-background"
            />
            Colour
          </label>
          <input
            type="range"
            aria-label="Grid opacity"
            min={10}
            max={100}
            value={look.opacity}
            onChange={(e) =>
              show(grid, { ...look, opacity: Number(e.target.value) })
            }
            className="min-w-0 flex-1 accent-primary"
          />
          <span className="w-10 text-right tabular-nums">{look.opacity}%</span>
        </div>

        {!valid && (
          <FormMessage tone="error">
            Width and height must be between 1 and {MAX_GRID} px.
          </FormMessage>
        )}

        <div className="flex justify-between gap-2 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => show(squareGrid(16), DEFAULT_GRID_LOOK)}
          >
            Reset
          </Button>
          <span className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                kept.current = false;
                dialog.current?.close();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Done
            </Button>
          </span>
        </div>
      </form>
    </dialog>
  );
}
