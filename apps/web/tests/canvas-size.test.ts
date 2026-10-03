import { describe, expect, it } from "vitest";
import {
  bordersFor,
  drawnBounds,
  movedSlices,
  sizeWith,
} from "@/lib/sprite/canvas-size";
import type { Slice } from "@/lib/slices/slices";

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
