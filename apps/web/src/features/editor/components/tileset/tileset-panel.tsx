"use client";

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
              title={`Tile ${i + 1}: click, then click the canvas to place it`}
              aria-pressed={sprite.activeTile === i}
              onClick={() => {
                sprite.setActiveTile(i);
                sprite.setTileFlip(NO_FLIP);
                onPickTile();
              }}
              className={cn(
                "aspect-square overflow-hidden rounded-[3px] ring-1 ring-black/10",
                sprite.activeTile === i && "ring-2 ring-foreground",
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
        title="Saves the tiles as one PNG and the layout as a Tiled map (.tmj) for Godot, Unity and other engines"
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
