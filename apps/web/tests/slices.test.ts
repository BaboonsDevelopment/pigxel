import { describe, expect, it } from "vitest";
import { resizedSlice, type Slice } from "@/lib/slices/slices";

const slice = (patch: Partial<Slice>): Slice => ({
  id: "a",
  name: "frame",
  bounds: { x: 0, y: 0, w: 8, h: 8 },
  center: null,
  pivot: null,
  ...patch,
});

describe("resizing a slice", () => {
  it("keeps its 9-slice border and offered pivot in the new size", () => {
    const resized = resizedSlice(
      slice({
        center: { x: 2, y: 2, w: 4, h: 4 },
        pivot: { x: 4, y: 7 },
      }),
      { x: 1, y: 1, w: 12, h: 6 },
    );
    expect(resized.bounds).toEqual({ x: 1, y: 1, w: 12, h: 6 });
    expect(resized.center).toEqual({ x: 2, y: 2, w: 8, h: 2 });
    expect(resized.pivot).toEqual({ x: 6, y: 5 });
  });
  it("drops the centre when the corners no longer leave room for it", () => {
    const resized = resizedSlice(
      slice({ center: { x: 2, y: 2, w: 4, h: 4 } }),
      { x: 0, y: 0, w: 4, h: 8 },
    );
    expect(resized.center).toBeNull();
  });
  it("leaves a pivot of its own where it is", () => {
    const resized = resizedSlice(slice({ pivot: { x: 1, y: 3 } }), {
      x: 0,
      y: 0,
      w: 2,
      h: 2,
    });
    expect(resized.pivot).toEqual({ x: 1, y: 3 });
  });
});
