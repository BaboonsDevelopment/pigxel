import { describe, expect, it } from "vitest";
import {
  FLIP_X,
  NO_FLIP,
  TURN_RIGHT,
  composeFlips,
  flipTile,
  readCell,
  syncTilemap,
  tileCells,
  withNewTiles,
  writeCell,
} from "@/lib/tilemap/tilemap";
import { tiledMap, tilesetImage } from "@/lib/tilemap/export";
import { parsePigxel, serializePigxel } from "@/lib/pigxel-file/format";
import { createLayer } from "@/lib/layers/tree";
import { createFrame } from "@/lib/sprite/frames";

const size = { w: 4, h: 2 };
const tile = { w: 2, h: 2 };
const RED = [255, 0, 0, 255];
const BLUE = [0, 0, 255, 255];

const block = (color: number[]) =>
  new Uint8ClampedArray(Array.from({ length: 4 }, () => color).flat());

const picture = (...cells: (number[] | null)[]) => {
  const out = new Uint8ClampedArray(size.w * size.h * 4);
  cells.forEach((color, col) =>
    writeCell(out, size, tile, col, 0, color ? block(color) : null),
  );
  return out;
};

describe("tilemap", () => {
  it("cuts a picture into unique tiles", () => {
    const tiles = withNewTiles([], [picture(RED, RED)], size, tile);
    expect(tiles).toHaveLength(1);
    expect(
      tileCells(picture(RED, null), size, tile, tiles).map(
        (c) => c?.index ?? null,
      ),
    ).toEqual([0, null]);
  });

  it("in manual mode, changing one copy changes every copy", () => {
    const before = picture(RED, RED);
    const after = new Uint8ClampedArray(before);
    after.set(BLUE, 0);
    const other = picture(RED, null);
    const synced = syncTilemap({
      size,
      tile,
      tiles: [block(RED)],
      before: [before, other],
      after: [after, other],
      mode: "manual",
    });
    expect(synced.tiles).toHaveLength(1);
    expect([...readCell(synced.cels[0], size, tile, 1, 0).slice(0, 4)]).toEqual(
      BLUE,
    );
    expect([...readCell(synced.cels[1], size, tile, 0, 0).slice(0, 4)]).toEqual(
      BLUE,
    );
  });

  it("in auto mode, a changed copy becomes a new tile", () => {
    const before = picture(RED, RED);
    const after = new Uint8ClampedArray(before);
    after.set(BLUE, 0);
    const synced = syncTilemap({
      size,
      tile,
      tiles: [block(RED)],
      before: [before],
      after: [after],
      mode: "auto",
    });
    expect(synced.tiles).toHaveLength(2);
    expect(readCell(synced.cels[0], size, tile, 1, 0)).toEqual(block(RED));
  });

  it("placing a tile never changes the tileset's other tiles", () => {
    const synced = syncTilemap({
      size,
      tile,
      tiles: [block(RED), block(BLUE)],
      before: [picture(RED, RED)],
      after: [picture(BLUE, RED)],
      mode: "place",
    });
    expect(synced.tiles).toEqual([block(RED), block(BLUE)]);
    expect(readCell(synced.cels[0], size, tile, 1, 0)).toEqual(block(RED));
  });

  it("saves and opens tilemap layers", () => {
    const base = createLayer("tilemap", "Level");
    const layer = { ...base, tile, tiles: [block(RED)] };
    const frame = createFrame();
    const doc = parsePigxel(
      serializePigxel({
        id: crypto.randomUUID(),
        width: size.w,
        height: size.h,
        background: "transparent",
        layers: [layer],
        frames: [frame],
        cels: new Map([[frame.id, new Map([[layer.id, picture(RED, null)]])]]),
        palette: [],
        slices: [],
      }),
    );
    const opened = doc.layers[0]!;
    expect(opened.kind).toBe("tilemap");
    if (opened.kind !== "tilemap") return;
    expect(opened.tile).toEqual(tile);
    expect(opened.tiles).toEqual([block(RED)]);
  });
});

describe("flipped tiles", () => {
  const sq = { w: 2, h: 2 };
  const pic = { w: 4, h: 2 };
  const corner = new Uint8ClampedArray([
    ...[255, 0, 0, 255],
    ...[0, 0, 0, 0],
    ...[0, 0, 0, 0],
    ...[0, 0, 0, 0],
  ]);
  const both = () => {
    const out = new Uint8ClampedArray(pic.w * pic.h * 4);
    writeCell(out, pic, sq, 0, 0, corner);
    writeCell(out, pic, sq, 1, 0, flipTile(corner, sq, FLIP_X));
    return out;
  };

  it("treats a mirrored copy as the same tile when asked", () => {
    expect(withNewTiles([], [both()], pic, sq)).toHaveLength(2);
    expect(withNewTiles([], [both()], pic, sq, true)).toHaveLength(1);
    expect(tileCells(both(), pic, sq, [corner], true)[1]?.flip).toEqual(FLIP_X);
  });

  it("updates mirrored copies mirrored", () => {
    const before = both();
    const after = new Uint8ClampedArray(before);
    after.set([0, 0, 255, 255], 4);
    const synced = syncTilemap({
      size: pic,
      tile: sq,
      tiles: [corner],
      before: [before],
      after: [after],
      mode: "manual",
      flips: true,
    });
    expect([...readCell(synced.cels[0], pic, sq, 1, 0).slice(0, 4)]).toEqual([
      0, 0, 255, 255,
    ]);
  });

  it("turning four times comes back", () => {
    let flip = NO_FLIP;
    for (let i = 0; i < 4; i++) flip = composeFlips(flip, TURN_RIGHT);
    expect(flip).toEqual(NO_FLIP);
  });

  it("exports Tiled flip flags", () => {
    const map = JSON.parse(
      tiledMap({
        name: "t",
        size: pic,
        tile: sq,
        tiles: [corner],
        flips: true,
        image: { file: "t.png", w: 2, h: 2, columns: 1 },
        frames: [{ name: "t", pixels: both() }],
      }),
    );
    expect(map.layers[0].data).toEqual([1, 0x80000001]);
    expect(tilesetImage([corner, corner], sq)).toMatchObject({ w: 4, h: 2 });
  });
});

describe("live copies", () => {
  it("keeps following the tile while you keep drawing", () => {
    const before = picture(RED, RED);
    const first = new Uint8ClampedArray(before);
    first.set(BLUE, 0);
    const pass = syncTilemap({
      size,
      tile,
      tiles: [block(RED)],
      before: [before],
      after: [first],
      mode: "manual",
      collect: false,
    });
    const second = new Uint8ClampedArray(pass.cels[0]!);
    second.set([0, 255, 0, 255], 0);
    const next = syncTilemap({
      size,
      tile,
      tiles: [block(RED)],
      before: [before],
      after: [second],
      mode: "manual",
      written: pass.written,
    });
    expect([...readCell(next.cels[0], size, tile, 1, 0).slice(0, 4)]).toEqual([
      0, 255, 0, 255,
    ]);
    expect(next.tiles).toHaveLength(1);
  });
});
