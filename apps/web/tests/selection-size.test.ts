import { describe, expect, it } from "vitest";
import { areaAround } from "@/features/editor/pixel-canvas/helpers";

describe("selection size", () => {
  it("measures the box around a lasso path inside the canvas", () => {
    const size = { w: 16, h: 16 };
    expect(
      areaAround(
        [
          { x: 3, y: 2 },
          { x: 9, y: 5 },
          { x: 5, y: 11 },
        ],
        size,
      ),
    ).toEqual({ x: 3, y: 2, w: 7, h: 10 });
    expect(
      areaAround(
        [
          { x: -4, y: 2 },
          { x: 20, y: 2 },
        ],
        size,
      ),
    ).toEqual({ x: 0, y: 2, w: 16, h: 1 });
  });
});
