import { describe, expect, it } from "vitest";
import {
  cutSheet,
  guessSheetGrid,
  nativeSheet,
  sheetCells,
  sheetGridProblem,
} from "@/lib/pigxel-file/import-sheet";

const sheet = (
  w: number,
  h: number,
  empty: (x: number, y: number) => boolean = () => false,
) => {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!empty(x, y)) rgba.set([x, y, 0, 255], (y * w + x) * 4);
  return { rgba, w, h };
};

describe("importing a sprite sheet", () => {
  it("guesses frames in a row or a column by how alike neighbours look", () => {
    const w = 64 * 20;
    const row = sheet(w, 48, (x, y) => {
      const f = Math.floor(x / 64);
      const left = 20 + (f % 3);
      return !(x % 64 >= left && x % 64 < left + 20 && y >= 10 && y < 30);
    });
    expect(guessSheetGrid(row)).toMatchObject({ frameW: 64, frameH: 48 });
    const column = sheet(16, 48, (x, y) => (y % 16) + x < 10);
    expect(guessSheetGrid(column)).toMatchObject({ frameW: 16, frameH: 16 });
    expect(guessSheetGrid(sheet(30, 20))).toMatchObject({
      frameW: 30,
      frameH: 20,
    });
  });
  it("guesses frames in a grid", () => {
    const grid = sheet(64 * 5, 48 * 4, (x, y) => {
      const f = Math.floor(x / 64) + Math.floor(y / 48) * 5;
      const left = 20 + (f % 3);
      return !(
        x % 64 >= left &&
        x % 64 < left + 20 &&
        y % 48 >= 10 &&
        y % 48 < 30
      );
    });
    expect(guessSheetGrid(grid)).toMatchObject({ frameW: 64, frameH: 48 });
    expect(cutSheet(grid, guessSheetGrid(grid)).frames).toHaveLength(20);
  });
  it("reads a sheet exported enlarged at its own size", () => {
    const small = sheet(8, 2);
    const big = { w: 32, h: 8, rgba: new Uint8ClampedArray(32 * 8 * 4) };
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 32; x++)
        big.rgba.set(
          small.rgba.subarray(
            (Math.floor(y / 4) * 8 + Math.floor(x / 4)) * 4,
            (Math.floor(y / 4) * 8 + Math.floor(x / 4)) * 4 + 4,
          ),
          (y * 32 + x) * 4,
        );
    const native = nativeSheet(big);
    expect(native.scale).toBe(4);
    expect([...native.picture.rgba]).toEqual([...small.rgba]);
  });
  it("finds every whole frame, with an offset and gaps", () => {
    const grid = {
      ...guessSheetGrid(sheet(1, 1)),
      frameW: 4,
      frameH: 4,
      offsetX: 1,
      offsetY: 1,
      gapX: 1,
      gapY: 2,
    };
    expect(sheetCells(grid, 11, 11).map((c) => [c.x, c.y])).toEqual([
      [1, 1],
      [6, 1],
      [1, 7],
      [6, 7],
    ]);
  });
  it("cuts frames row by row and leaves out empty ones", () => {
    const pic = sheet(8, 4, (x, y) => y >= 2 && x >= 4);
    const grid = {
      ...guessSheetGrid(sheet(8, 4)),
      frameW: 4,
      frameH: 2,
      duration: 60,
    };
    const cut = cutSheet(pic, grid);
    expect(cut.frames).toHaveLength(3);
    expect([cut.w, cut.h]).toEqual([4, 2]);
    expect(cut.frames[1]!.rgba[0]).toBe(4);
    expect(cut.frames[2]!.rgba[1]).toBe(2);
    expect(cut.frames.every((f) => f.duration === 60)).toBe(true);
    expect(cutSheet(pic, { ...grid, skipEmpty: false }).frames).toHaveLength(4);
  });
  it("explains what is wrong with a grid", () => {
    const grid = guessSheetGrid(sheet(8, 8));
    expect(sheetGridProblem(grid, 8, 8)).toBeNull();
    expect(sheetGridProblem({ ...grid, frameW: 300 }, 600, 8)).toMatch(
      "at most 256",
    );
    expect(sheetGridProblem({ ...grid, offsetX: 4 }, 8, 8)).toMatch(
      "No whole frame",
    );
  });
});
