"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { Checkbox } from "@pigxel/ui/components/choice";
import { cn } from "@pigxel/ui/lib/utils";
import type { SpriteApi } from "../../pixel-canvas/use-sprite";
import {
  FLIP_X,
  FLIP_Y,
  NO_FLIP,
  TILE_MODES,
  TURN_RIGHT,
  composeFlips,
  flipTile,
  isSquareTile,
  movedTile,
  type TileFlip,
} from "@/lib/tilemap/tilemap";
import { TileSwatch } from "./tile-swatch";

export function TilesetPanel({
  sprite,
  onNewTilemap,
  onPickTile,
  onExport,
}: {
  sprite: SpriteApi;
  onNewTilemap: (convert: boolean) => void;
  onPickTile: () => void;
  onExport: () => void;
}) {
  const layer = sprite.activeLayer;
  const [dragged, setDragged] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (layer?.kind !== "tilemap")
    return (
      <div className="space-y-2 p-2 text-xs text-muted-foreground">
        <p>
          A tilemap layer is built from small tiles. Draw a tile once, place
          copies of it anywhere, and fixing one copy fixes them all.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" onClick={() => onNewTilemap(false)}>
            New tilemap layer…
          </Button>
          {layer?.kind === "normal" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNewTilemap(true)}
            >
              Turn this layer into tiles…
            </Button>
          )}
        </div>
      </div>
    );

  const mode = TILE_MODES.find((item) => item.value === sprite.tileMode)!;
  const picked = layer.tiles[sprite.activeTile];
  const turn = (flip: TileFlip) =>
    sprite.setTileFlip(composeFlips(sprite.tileFlip, flip));
  const manual = sprite.tileMode === "manual";
  const move = (from: number, to: number) => {
    if (from === to) return;
    const order = movedTile(
      layer.tiles.map((_, i) => i),
      from,
      to,
    );
    sprite.setTiles(layer.id, movedTile(layer.tiles, from, to));
    sprite.setActiveTile(order.indexOf(sprite.activeTile));
  };
  const duplicate = () => {
    if (!picked) return;
    const at = sprite.activeTile + 1;
    sprite.setTiles(layer.id, [
      ...layer.tiles.slice(0, at),
      new Uint8ClampedArray(picked),
      ...layer.tiles.slice(at),
    ]);
    sprite.setActiveTile(at);
    setStatus(
      "Copy added. Draw on the tile on the canvas to change the original; the copy keeps the old look.",
    );
  };
  const removeUnused = () => {
    const removed = sprite.removeUnusedTiles(layer.id);
    setStatus(
      removed
        ? `Deleted ${removed} unused ${removed === 1 ? "tile" : "tiles"}.`
        : "Every tile is in use.",
    );
  };

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-2">
        <div
          role="radiogroup"
          aria-label="When you draw on a tile"
          className="flex rounded-md border p-0.5"
        >
          {TILE_MODES.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={sprite.tileMode === value}
              title={hint}
              onClick={() => sprite.setTileMode(value)}
              className="rounded px-2 py-0.5 text-xs aria-checked:bg-muted aria-checked:font-semibold"
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {layer.tile.w}×{layer.tile.h} · {layer.tiles.length}{" "}
          {layer.tiles.length === 1 ? "tile" : "tiles"}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">{mode.hint}.</p>
      {layer.tiles.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1">
          {layer.tiles.map((pixels, i) => (
            <button
              key={i}
              type="button"
              title={`Tile ${i + 1}: click, then click the canvas to place it · drag to reorder`}
              aria-pressed={sprite.activeTile === i}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setDragged(i);
              }}
              onDragOver={(e) => {
                if (dragged === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragged !== null) move(dragged, i);
                setDragged(null);
              }}
              onDragEnd={() => setDragged(null)}
              onClick={() => {
                sprite.setActiveTile(i);
                sprite.setTileFlip(NO_FLIP);
                onPickTile();
              }}
              className={cn(
                "aspect-square overflow-hidden rounded-[3px] ring-1 ring-black/10",
                sprite.activeTile === i && "ring-2 ring-foreground",
                dragged === i && "opacity-40",
              )}
            >
              <TileSwatch pixels={pixels} tile={layer.tile} />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No tiles yet. Draw on this layer with any tool, and every filled cell
          becomes a tile.
        </p>
      )}
      {layer.tiles.length > 0 && (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            disabled={!picked || !manual}
            title={
              manual
                ? "Adds a copy of the picked tile next to it"
                : "In Auto mode unused tiles are removed, so switch to Manual to keep copies"
            }
            onClick={duplicate}
          >
            Duplicate tile
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            disabled={!manual}
            title={
              manual
                ? "Deletes tiles that aren’t placed in any frame"
                : "Auto mode already deletes unused tiles"
            }
            onClick={removeUnused}
          >
            Delete unused
          </Button>
        </div>
      )}
      {status && (
        <p role="status" className="text-[11px] text-muted-foreground">
          {status}
        </p>
      )}
      <label className="flex items-start gap-2 text-xs">
        <Checkbox
          checked={layer.flips}
          onChange={(e) => sprite.setTileFlips(layer.id, e.target.checked)}
        />
        <span>
          Flipped and turned copies count as the same tile
          <span className="block text-muted-foreground">
            Mirror a tile when you place it instead of drawing a new one.
          </span>
        </span>
      </label>
      {layer.flips && picked && (
        <div className="flex items-center gap-1.5">
          <span className="size-8 overflow-hidden rounded-[3px] ring-1 ring-black/10">
            <TileSwatch
              pixels={flipTile(picked, layer.tile, sprite.tileFlip)}
              tile={layer.tile}
            />
          </span>
          <Button size="sm" variant="secondary" onClick={() => turn(FLIP_X)}>
            Flip ↔
          </Button>
          <Button size="sm" variant="secondary" onClick={() => turn(FLIP_Y)}>
            Flip ↕
          </Button>
          {isSquareTile(layer.tile) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => turn(TURN_RIGHT)}
            >
              Turn ↻
            </Button>
          )}
        </div>
      )}
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        disabled={!layer.tiles.length}
        title="Saves the tiles as one PNG, a Godot TileSet (.tres) and the layout as a Tiled map (.tmj) for Godot, Unity and other engines. Keep the PNG next to the .tres"
        onClick={onExport}
      >
        Export tileset and map
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="w-full"
        onClick={() => sprite.convertToNormal(layer.id)}
      >
        Turn back into a normal layer
      </Button>
    </div>
  );
}
