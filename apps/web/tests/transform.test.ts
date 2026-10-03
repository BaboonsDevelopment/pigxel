import { describe, expect, it } from "vitest";
import type { Slice } from "@/lib/slices/slices";
import { transformPixels, transformSlices } from "@/lib/sprite/transform";

function picture(rows: string[]) {
  const w = rows[0]!.length;
  const rgba = new Uint8ClampedArray(w * rows.length * 4);
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => (rgba[(y * w + x) * 4] = c.charCodeAt(0))),
  );
  return { rgba, w, h: rows.length };
}

function text({ rgba, w }: { rgba: Uint8ClampedArray; w: number }) {
  const out: string[] = [];
  for (let i = 0; i < rgba.length / 4; i += w)
    out.push(
      Array.from({ length: w }, (_, x) =>
        String.fromCharCode(rgba[(i + x) * 4]!),
      ).join(""),
    );
  return out;
}

const ab = picture(["abc", "def"]);
const turn = (t: Parameters<typeof transformPixels>[3]) =>
  text(transformPixels(ab.rgba, ab.w, ab.h, t));

describe("rotate and flip the whole tile", () => {
  it("mirrors left to right and top to bottom", () => {
    expect(turn("flipHorizontal")).toEqual(["cba", "fed"]);
    expect(turn("flipVertical")).toEqual(["def", "abc"]);
  });
  it("turns a quarter or half turn, swapping the size for a quarter", () => {
    expect(turn("rotateRight")).toEqual(["da", "eb", "fc"]);
    expect(turn("rotateLeft")).toEqual(["cf", "be", "ad"]);
    expect(turn("rotate180")).toEqual(["fed", "cba"]);
    expect(transformPixels(ab.rgba, 3, 2, "rotateRight")).toMatchObject({
      w: 2,
      h: 3,
    });
  });
  it("turns slices with the tile, their centre and pivot too", () => {
    const door: Slice = {
      id: "d",
      name: "door",
      bounds: { x: 0, y: 0, w: 4, h: 2 },
      center: { x: 1, y: 0, w: 2, h: 1 },
      pivot: { x: 0, y: 1 },
    };
    expect(transformSlices([door], 8, 6, "rotateRight")).toEqual([
      {
        ...door,
        bounds: { x: 4, y: 0, w: 2, h: 4 },
        center: { x: 1, y: 1, w: 1, h: 2 },
        pivot: { x: 0, y: 0 },
      },
    ]);
    expect(transformSlices([door], 8, 6, "flipHorizontal")[0]!.bounds).toEqual({
      x: 4,
      y: 0,
      w: 4,
      h: 2,
    });
  });
});
