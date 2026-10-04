import { describe, expect, it } from "vitest";
import { rectPoints, roundedRectPoints } from "@/lib/edit/raster";
import { roundedRectMask } from "@/features/editor/pixel-canvas/selection";

const grid = (points: { x: number; y: number }[], w: number, h: number) =>
  Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) =>
      points.some((p) => p.x === x && p.y === y) ? "#" : ".",
    ).join(""),
  );

const box = { x: 0, y: 0, w: 7, h: 5 };

describe("rounded rectangles", () => {
  it("cuts the corners by the radius", () => {
    expect(grid(roundedRectPoints(box, true, 2), 7, 5)).toEqual([
      "..###..",
      ".#####.",
      "#######",
      ".#####.",
      "..###..",
    ]);
    expect(grid(roundedRectPoints(box, false, 1), 7, 5)).toEqual([
      ".#####.",
      "#.....#",
      "#.....#",
      "#.....#",
      ".#####.",
    ]);
  });
  it("is a plain rectangle with no radius", () => {
    expect(roundedRectPoints(box, false, 0)).toEqual(rectPoints(box, false));
  });
  it("selects a rounded rectangle", () => {
    const mask = roundedRectMask({ w: 7, h: 5 }, box, 2);
    expect(mask[0]).toBe(0);
    expect(mask[2]).toBe(1);
    expect(mask[2 * 7]).toBe(1);
  });
});
