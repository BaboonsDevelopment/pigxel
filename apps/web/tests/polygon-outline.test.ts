import { describe, expect, it } from "vitest";
import { polygonOutline } from "@/lib/edit/raster";

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
