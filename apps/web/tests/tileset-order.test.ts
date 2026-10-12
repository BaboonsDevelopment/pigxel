import { describe, expect, it } from "vitest";
import { cellArea, movedTile, usedTiles } from "@/lib/tilemap/tilemap";

const tile = { w: 1, h: 1 };
const px = (r: number) => new Uint8ClampedArray([r, 0, 0, 255]);

describe("tileset", () => {
  it("moves a tile to a new place", () => {
    expect(movedTile(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(movedTile(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
  });
  it("keeps only tiles placed in some frame", () => {
    const tiles = [px(1), px(2), px(3)];
    const frameA = new Uint8ClampedArray([1, 0, 0, 255, 0, 0, 0, 0]);
    const frameB = new Uint8ClampedArray([0, 0, 0, 0, 3, 0, 0, 255]);
    expect(usedTiles(tiles, [frameA, frameB], { w: 2, h: 1 }, tile)).toEqual([
      tiles[0],
      tiles[2],
    ]);
  });
  it("fills only the connected cells that look the same", () => {
    const size = { w: 4, h: 1 };
    const wall = [9, 9, 9, 255];
    const empty = [0, 0, 0, 0];
    const cel = new Uint8ClampedArray([...empty, ...empty, ...wall, ...empty]);
    expect(cellArea(cel, size, tile, { col: 0, row: 0 })).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
    ]);
    expect(cellArea(cel, size, tile, { col: 2, row: 0 })).toEqual([
      { col: 2, row: 0 },
    ]);
  });
});
