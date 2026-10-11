import { describe, expect, it } from "vitest";
import {
  bordersFor,
  drawnBounds,
  movedSlices,
  sizeWith,
} from "@/lib/sprite/canvas-size";
import { type Slice } from "@/lib/slices/slices";
import {
  scale2x,
  scalePicture,
  scaledSlices,
  sizeAtPercent,
} from "@/lib/sprite/sprite-size";
import { stretchedSource } from "@/features/editor/export/export";
import {
  blankDocument,
  parsePigxel,
  serializePigxel,
} from "@/lib/pigxel-file/format";
import { readPixelRatio } from "@/lib/sprite/pixel-ratio";

const tile = { w: 32, h: 32 };

describe("canvas size", () => {
  it("adds space on the sides away from the anchor", () => {
    expect(bordersFor(tile, { w: 40, h: 36 }, { x: 0, y: 0 })).toEqual({
      left: 0,
      top: 0,
      right: 8,
      bottom: 4,
    });
    expect(bordersFor(tile, { w: 40, h: 32 }, { x: 1, y: 0.5 })).toEqual({
      left: 8,
      top: 0,
      right: 0,
      bottom: 0,
    });
    expect(bordersFor(tile, { w: 41, h: 33 }, { x: 0.5, y: 0.5 })).toEqual({
      left: 4,
      top: 0,
      right: 5,
      bottom: 1,
    });
  });
  it("cuts away space the same way when shrinking", () => {
    expect(bordersFor(tile, { w: 16, h: 16 }, { x: 0.5, y: 1 })).toEqual({
      left: -8,
      top: -16,
      right: -8,
      bottom: 0,
    });
  });
  it("gives the size for borders, and the borders for that size back", () => {
    const borders = { left: 8, top: -4, right: 2, bottom: 0 };
    const next = sizeWith(tile, borders);
    expect(next).toEqual({ w: 42, h: 28 });
    for (const anchor of [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ] as const)
      expect(sizeWith(tile, bordersFor(tile, next, anchor))).toEqual(next);
  });
  it("moves slices with the drawing and cuts them to the new size", () => {
    const door: Slice = {
      id: "door",
      name: "door",
      bounds: { x: 0, y: 4, w: 8, h: 8 },
      center: { x: 2, y: 2, w: 4, h: 4 },
      pivot: { x: 4, y: 7 },
    };
    expect(movedSlices([door], 8, 0, 40, 32)[0]!.bounds).toEqual({
      x: 8,
      y: 4,
      w: 8,
      h: 8,
    });
    const [cut] = movedSlices([door], -4, 0, 28, 32);
    expect(cut).toMatchObject({
      bounds: { x: 0, y: 4, w: 4, h: 8 },
      center: { x: 0, y: 2, w: 2, h: 4 },
      pivot: { x: 0, y: 7 },
    });
    expect(movedSlices([door], -8, 0, 24, 32)).toEqual([]);
  });

  it("finds the box around everything drawn in any frame, for Trim", () => {
    const frame = (dots: [number, number, string?][]) => {
      const rgba = new Uint8ClampedArray(8 * 8 * 4);
      for (const [x, y, colour] of dots) {
        const at = (y * 8 + x) * 4;
        rgba.set(
          colour === "white" ? [255, 255, 255, 255] : [200, 0, 0, 255],
          at,
        );
      }
      return rgba;
    };
    expect(drawnBounds([frame([[2, 3]]), frame([[5, 4]])], 8, 8)).toEqual({
      x: 2,
      y: 3,
      w: 4,
      h: 2,
    });
    expect(drawnBounds([frame([])], 8, 8)).toBeNull();
    expect(
      drawnBounds(
        [
          frame([
            [0, 0, "white"],
            [3, 3],
          ]),
        ],
        8,
        8,
        [255, 255, 255],
      ),
    ).toEqual({ x: 3, y: 3, w: 1, h: 1 });
  });
});

const RED = [255, 0, 0, 255];
const CLEAR = [0, 0, 0, 0];

function picture(rows: string[]) {
  const w = rows[0]!.length;
  const rgba = new Uint8ClampedArray(w * rows.length * 4);
  rows.forEach((row, y) =>
    [...row].forEach((c, x) =>
      rgba.set(c === "#" ? RED : CLEAR, (y * w + x) * 4),
    ),
  );
  return { rgba, w, h: rows.length };
}

function rows(rgba: Uint8ClampedArray, w: number) {
  const out: string[] = [];
  for (let i = 0; i < rgba.length / 4; i += w)
    out.push(
      Array.from({ length: w }, (_, x) =>
        rgba[(i + x) * 4 + 3] ? "#" : ".",
      ).join(""),
    );
  return out;
}

describe("sprite size", () => {
  it("doubles and halves crisply with the nearest pixel", () => {
    const small = picture(["#.", ".#"]);
    const big = scalePicture(small, 4, 4, "nearest");
    expect(rows(big, 4)).toEqual(["##..", "##..", "..##", "..##"]);
    expect(
      rows(scalePicture({ rgba: big, w: 4, h: 4 }, 2, 2, "nearest"), 2),
    ).toEqual(["#.", ".#"]);
  });
  it("blends neighbours with bilinear, without darkening clear edges", () => {
    const out = scalePicture(picture(["#."]), 4, 1, "bilinear");
    expect([...out.slice(0, 4)]).toEqual(RED);
    expect(out[4 * 2]).toBe(255);
    expect(out[4 * 2 + 3]).toBeGreaterThan(0);
    expect(out[4 * 2 + 3]).toBeLessThan(255);
  });
  it("rounds off stair-steps with Scale2x, and RotSprite adds no colours", () => {
    const diagonal = picture(["#.", "##"]);
    expect(rows(scale2x(diagonal).rgba, 4)).toEqual([
      "##..",
      "###.",
      "####",
      "####",
    ]);
    const out = scalePicture(diagonal, 3, 3, "rotsprite");
    for (let i = 0; i < out.length; i += 4)
      expect([RED, CLEAR]).toContainEqual([...out.slice(i, i + 4)]);
  });
  it("sizes by percent, at least 1 px", () => {
    expect(sizeAtPercent(64, 48, 50)).toEqual({ w: 32, h: 24 });
    expect(sizeAtPercent(32, 32, 150)).toEqual({ w: 48, h: 48 });
    expect(sizeAtPercent(4, 4, 1)).toEqual({ w: 1, h: 1 });
  });
  it("scales slices with the tile", () => {
    const door: Slice = {
      id: "d",
      name: "door",
      bounds: { x: 8, y: 16, w: 16, h: 16 },
      center: { x: 4, y: 4, w: 8, h: 8 },
      pivot: { x: 8, y: 15 },
    };
    expect(scaledSlices([door], { w: 64, h: 64 }, { w: 32, h: 32 })).toEqual([
      {
        ...door,
        bounds: { x: 4, y: 8, w: 8, h: 8 },
        center: { x: 2, y: 2, w: 4, h: 4 },
        pivot: { x: 4, y: 7 },
      },
    ]);
  });
});

describe("pixel ratio", () => {
  it("keeps wide or tall pixels in the .pigxel file, nothing for square", () => {
    const wide = {
      ...blankDocument(2, 2, "transparent"),
      pixelRatio: { w: 2, h: 1 } as const,
    };
    expect(parsePigxel(serializePigxel(wide)).pixelRatio).toEqual({
      w: 2,
      h: 1,
    });
    expect(serializePigxel(blankDocument(2, 2, "transparent"))).not.toContain(
      "pixelRatio",
    );
    expect(readPixelRatio({ w: 3, h: 1 })).toEqual({ w: 1, h: 1 });
  });
  it("exports 2:1 pixels as two square ones side by side", () => {
    const red = [255, 0, 0, 255];
    const blue = [0, 0, 255, 255];
    const source = stretchedSource(
      {
        name: "t",
        size: { w: 2, h: 1 },
        frames: [],
        frameId: "f",
        background: "transparent",
        picture: () => new Uint8ClampedArray([...red, ...blue]),
        slices: [
          {
            id: "s",
            name: "s",
            bounds: { x: 1, y: 0, w: 1, h: 1 },
            center: null,
            pivot: null,
          },
        ],
      },
      { w: 2, h: 1 },
    );
    expect(source.size).toEqual({ w: 4, h: 1 });
    expect([...source.picture("f")]).toEqual([
      ...red,
      ...red,
      ...blue,
      ...blue,
    ]);
    expect(source.slices[0]!.bounds).toEqual({ x: 2, y: 0, w: 2, h: 1 });
  });
});
