import { describe, expect, it } from "vitest";
import { mirrored } from "@/features/editor/pixel-canvas/paint";

const size = { w: 8, h: 8 };
const at = { x: 1, y: 2 };

describe("symmetry", () => {
  it("mirrors across the middle by default", () => {
    expect(mirrored(at, size, "horizontal")).toEqual([at, { x: 6, y: 2 }]);
    expect(mirrored(at, size, "vertical")).toEqual([at, { x: 1, y: 5 }]);
  });
  it("mirrors across moved axes", () => {
    expect(mirrored(at, size, "horizontal", { x: 2, y: 3.5 })).toEqual([
      at,
      { x: 3, y: 2 },
    ]);
  });
  it("mirrors across the diagonals", () => {
    expect(mirrored(at, size, "diagonal")).toEqual([at, { x: 2, y: 1 }]);
    expect(mirrored(at, size, "antiDiagonal")).toEqual([at, { x: 5, y: 6 }]);
  });
  it("makes eight copies with all axes", () => {
    const copies = mirrored(at, size, "all");
    expect(copies).toHaveLength(8);
    expect(new Set(copies.map((p) => `${p.x},${p.y}`)).size).toBe(8);
  });
});
