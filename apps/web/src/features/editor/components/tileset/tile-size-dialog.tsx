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
import {
  DEFAULT_TILE,
  MAX_TILE,
  MIN_TILE,
  type TileSize,
} from "@/lib/tilemap/tilemap";
import { LockSwitch, SIZE_LABEL, SizeField } from "../size-controls";

const PRESETS = [8, 16, 32];

type TileSizeProps = {
  convert: boolean;
  onApply: (tile: TileSize) => void;
};

export default function TileSizeDialog({
  onClose,
  ...props
}: TileSizeProps & { onClose: () => void }) {
  return (
    <Dialog onClose={onClose} size="sm" portal>
      <TileSizeForm {...props} />
    </Dialog>
  );
}

function TileSizeForm({ convert, onApply }: TileSizeProps) {
  const { close } = useDialog();
  const [width, setWidth] = useState(String(DEFAULT_TILE.w));
  const [height, setHeight] = useState(String(DEFAULT_TILE.h));
  const [square, setSquare] = useState(DEFAULT_TILE.w === DEFAULT_TILE.h);
  const tile = { w: Number(width), h: Number(height) };
  const valid = [tile.w, tile.h].every(
    (side) => Number.isInteger(side) && side >= MIN_TILE && side <= MAX_TILE,
  );

  return (
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onApply(tile);
        close();
      }}
    >
      <ModalHeader
        title={convert ? "Turn Layer into Tiles" : "New Tilemap Layer"}
      />
      <DialogBody className="grid gap-5 py-5">
        <fieldset>
          <legend className={SIZE_LABEL}>Tile size</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {PRESETS.map((side) => {
              const on = tile.w === side && tile.h === side;
              return (
                <button
                  key={side}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setWidth(String(side));
                    setHeight(String(side));
                  }}
                  className={cn(
                    "h-11 rounded-xl border text-sm tabular-nums transition-colors",
                    on
                      ? "border-primary-soft bg-pastel-pink-soft font-semibold"
                      : "bg-background hover:bg-pink-base",
                  )}
                >
                  {side}×{side}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-4">
          <SizeField
            id="tile-width"
            label="Width"
            unit="px"
            value={width}
            onChange={(text) => {
              setWidth(text);
              if (square) setHeight(text);
            }}
          />
          <SizeField
            id="tile-height"
            label="Height"
            unit="px"
            value={height}
            onChange={(text) => {
              setHeight(text);
              if (square) setWidth(text);
            }}
          />
        </div>
        <LockSwitch
          label="Keep it square"
          on={square}
          onChange={(on) => {
            setSquare(on);
            if (on) setHeight(width);
          }}
        />
        {!valid && (
          <FormMessage tone="error">
            Each side must be between {MIN_TILE} and {MAX_TILE} px.
          </FormMessage>
        )}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={!valid}>
          {convert ? "Turn into tiles" : "Create layer"}
        </ModalButton>
      </DialogFooter>
    </form>
  );
}
