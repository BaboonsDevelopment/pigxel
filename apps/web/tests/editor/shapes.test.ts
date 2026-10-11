import { describe, expect, it } from "vitest";
import {
  rectPoints,
  roundedRectPoints,
  polygonOutline,
} from "@/lib/edit/raster";
import { roundedRectMask } from "@/features/editor/pixel-canvas/selection";
import { rectangleSpan } from "@/features/editor/pixel-canvas/pen";

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

describe("rectangle from centre", () => {
  it("keeps the initial pixel at the centre in every drag direction", () => {
    const center = { x: 10, y: 20 };
    for (const end of [
      { x: 14, y: 23 },
      { x: 6, y: 23 },
      { x: 14, y: 17 },
      { x: 6, y: 17 },
    ]) {
      const span = rectangleSpan(center, end, false, true);
      expect((span.from.x + span.to.x) / 2).toBe(center.x);
      expect((span.from.y + span.to.y) / 2).toBe(center.y);
    }
  });
  it("combines Alt and Shift to make a centred square", () => {
    const span = rectangleSpan({ x: 10, y: 10 }, { x: 14, y: 12 }, true, true);
    expect(Math.abs(span.to.x - span.from.x)).toBe(
      Math.abs(span.to.y - span.from.y),
    );
    expect((span.from.x + span.to.x) / 2).toBe(10);
    expect((span.from.y + span.to.y) / 2).toBe(10);
  });
  it("retains corner-to-corner drawing without Alt", () => {
    expect(
      rectangleSpan({ x: 10, y: 10 }, { x: 14, y: 12 }, false, false),
    ).toEqual({ from: { x: 10, y: 10 }, to: { x: 14, y: 12 } });
  });
});

describe("polygon outline", () => {
  it("closes all edges without filling the interior", () => {
    const points = polygonOutline([
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      { x: 5, y: 5 },
      { x: 1, y: 5 },
    ]);
    expect(points).toHaveLength(16);
    expect(points).toContainEqual({ x: 1, y: 3 });
    expect(points).not.toContainEqual({ x: 3, y: 3 });
  });
  it("does not duplicate shared corners or the closing vertex", () => {
    const points = polygonOutline([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 4, y: 4 },
    ]);
    expect(new Set(points.map((point) => `${point.x},${point.y}`)).size).toBe(
      points.length,
    );
    expect(points).toContainEqual({ x: 2, y: 2 });
    expect(points).not.toContainEqual({ x: 3, y: 1 });
    expect(polygonOutline([])).toEqual([]);
  });
});
