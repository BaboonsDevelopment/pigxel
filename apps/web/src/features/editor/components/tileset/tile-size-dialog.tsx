"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import {
  DEFAULT_TILE,
  MAX_TILE,
  MIN_TILE,
  type TileSize,
} from "@/lib/tilemap/tilemap";
import { NumberField } from "../number-field";

const PRESETS = [8, 16, 32];

export default function TileSizeDialog({
  convert,
  onApply,
  onClose,
}: {
  convert: boolean;
  onApply: (tile: TileSize) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tile, setTile] = useState(DEFAULT_TILE);
  useEffect(() => dialog.current?.showModal(), []);
  const valid = [tile.w, tile.h].every(
    (side) => Number.isInteger(side) && side >= MIN_TILE && side <= MAX_TILE,
  );

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="tile-size-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <form
        className="space-y-5 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onApply(tile);
          dialog.current?.close();
        }}
      >
        <div>
          <SectionTitle id="tile-size-title">
            {convert ? "Turn this layer into tiles" : "New tilemap layer"}
          </SectionTitle>
          <Lead className="mt-1">
            {convert
              ? "The layer is cut into a grid of cells. Cells that look the same become one tile, so changing it later changes all of them."
              : "Pick how big one tile is. The layer becomes a grid of cells this size, and each cell shows one tile."}
          </Lead>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={tile.w === side && tile.h === side}
              onClick={() => setTile({ w: side, h: side })}
              className="h-7 rounded-md border px-2.5 text-xs tabular-nums hover:bg-muted aria-pressed:border-foreground aria-pressed:bg-muted"
            >
              {side}×{side}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="w-24">
            <NumberField
              id="tile-width"
              label="Tile width, px"
              value={tile.w}
              onChange={(w) => setTile((t) => ({ ...t, w }))}
            />
          </div>
          <div className="w-24">
            <NumberField
              id="tile-height"
              label="Tile height, px"
              value={tile.h}
              onChange={(h) => setTile((t) => ({ ...t, h }))}
            />
          </div>
        </div>
        {!valid && (
          <FormMessage tone="error">
            Each side must be between {MIN_TILE} and {MAX_TILE} px.
          </FormMessage>
        )}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            {convert ? "Turn into tiles" : "Create layer"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
