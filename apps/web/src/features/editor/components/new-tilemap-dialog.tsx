"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  useDialog,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { Input } from "@pigxel/ui/components/input";
import { ModalButton } from "@/components/ui/modal-button";
import { MODAL_FOOTER, ModalHeader } from "@/components/ui/modal-header";
import { createTile } from "@/features/tiles/create-tile";
import { MAX_PIGXEL_SIZE } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { MAX_TILE, MIN_TILE } from "@/lib/tilemap/tilemap";
import { keepStartOptions } from "../start-options";
import { choiceClass } from "./new-project-dialog";
import { SIZE_LABEL, SizeField } from "./size-controls";

const PRESETS = [8, 16, 32, 64];
const DEFAULT_TILE = 16;
const DEFAULT_TILES = 16;

/** Starts a tilemap: a tile in Pigxel cloud sized to a grid of tiles. */
export function NewTilemapDialog({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} size="md" portal>
      <NewTilemapForm userId={userId} />
    </Dialog>
  );
}

/** A whole number in [min, max], or the default when the box is empty. */
const sideOf = (value: string, fallback: number, min: number, max: number) => {
  const n = value.trim() === "" ? fallback : Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

function NewTilemapForm({ userId }: { userId: string }) {
  const router = useRouter();
  const { close } = useDialog();
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<number | "custom">(DEFAULT_TILE);
  const [tileW, setTileW] = useState("");
  const [tileH, setTileH] = useState("");
  const [cols, setCols] = useState("");
  const [rows, setRows] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tile =
    preset === "custom"
      ? {
          w: sideOf(tileW, DEFAULT_TILE, MIN_TILE, MAX_TILE),
          h: sideOf(tileH, DEFAULT_TILE, MIN_TILE, MAX_TILE),
        }
      : { w: preset, h: preset };
  const grid = {
    w: sideOf(cols, DEFAULT_TILES, 1, MAX_PIGXEL_SIZE),
    h: sideOf(rows, DEFAULT_TILES, 1, MAX_PIGXEL_SIZE),
  };
  const canvas =
    tile.w && tile.h && grid.w && grid.h
      ? { w: tile.w * grid.w, h: tile.h * grid.h }
      : null;
  const fits =
    !!canvas && canvas.w <= MAX_PIGXEL_SIZE && canvas.h <= MAX_PIGXEL_SIZE;

  const create = async () => {
    if (!tile.w || !tile.h)
      return setError(`Tiles can be ${MIN_TILE} to ${MAX_TILE} px a side.`);
    if (!canvas || !fits)
      return setError(
        `The map can be at most ${MAX_PIGXEL_SIZE} × ${MAX_PIGXEL_SIZE} px.`,
      );
    setBusy(true);
    setError(null);
    const result = await createTile({
      userId,
      name: name.trim() || "Tilemap",
      width: canvas.w,
      height: canvas.h,
      background: "transparent",
      start: "tileset",
    });
    if ("error" in result) {
      setError(result.error);
      setBusy(false);
      return;
    }
    keepStartOptions(result.draftId, { tile: { w: tile.w, h: tile.h } });
    router.push(`${editorUrl(result.draftId)}&start=tileset`);
    close();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
      className="flex min-h-0 flex-col"
    >
      <ModalHeader title="New Tileset" />
      <DialogBody className="grid gap-5 py-5">
        <label className="block">
          <span className={SIZE_LABEL}>Project name</span>
          <Input
            autoFocus
            placeholder="My level"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl px-4"
          />
        </label>
        <fieldset>
          <legend className={SIZE_LABEL}>Tile size</legend>
          <div role="radiogroup" className="grid grid-cols-5 gap-2">
            {PRESETS.map((side) => (
              <button
                key={side}
                type="button"
                role="radio"
                aria-checked={preset === side}
                onClick={() => setPreset(side)}
                className={choiceClass(preset === side)}
              >
                {side}×{side}
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={preset === "custom"}
              onClick={() => setPreset("custom")}
              className={choiceClass(preset === "custom")}
            >
              Custom
            </button>
          </div>
        </fieldset>
        {preset === "custom" && (
          <SidePair
            id="tile"
            labels={["Tile width", "Tile height"]}
            unit="px"
            placeholder={DEFAULT_TILE}
            values={[tileW, tileH]}
            onChange={[setTileW, setTileH]}
          />
        )}
        <SidePair
          id="map"
          labels={["Columns", "Rows"]}
          unit="tiles"
          placeholder={DEFAULT_TILES}
          values={[cols, rows]}
          onChange={[setCols, setRows]}
        />
        <p
          className={
            canvas && !fits
              ? "-mt-2 text-xs text-destructive"
              : "-mt-2 text-xs text-muted-foreground"
          }
        >
          {canvas
            ? `Map: ${canvas.w} × ${canvas.h} px${fits ? "" : `, over the ${MAX_PIGXEL_SIZE} px limit`}`
            : `Tiles are ${MIN_TILE}–${MAX_TILE} px a side.`}
        </p>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter className={MODAL_FOOTER}>
        <ModalButton variant="secondary" onClick={close}>
          Cancel
        </ModalButton>
        <ModalButton type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create"}
        </ModalButton>
      </DialogFooter>
    </form>
  );
}

/** Two size boxes side by side with a × between them. */
function SidePair({
  id,
  labels,
  unit,
  placeholder,
  values,
  onChange,
}: {
  id: string;
  labels: [string, string];
  unit: string;
  placeholder: number;
  values: [string, string];
  onChange: [(value: string) => void, (value: string) => void];
}) {
  const field = (i: 0 | 1) => (
    <div className="min-w-0 flex-1">
      <SizeField
        id={`${id}-${i}`}
        label={labels[i]}
        unit={unit}
        placeholder={String(placeholder)}
        value={values[i]}
        onChange={onChange[i]}
      />
    </div>
  );
  return (
    <div className="flex items-end gap-3">
      {field(0)}
      <span
        aria-hidden="true"
        className="flex h-14 items-center text-muted-foreground"
      >
        ×
      </span>
      {field(1)}
    </div>
  );
}
