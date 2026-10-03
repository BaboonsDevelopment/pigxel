import { describe, expect, it } from "vitest";
import type { Slice } from "@/lib/slices/slices";
import {
  scale2x,
  scalePicture,
  scaledSlices,
  sizeAtPercent,
} from "@/lib/sprite/sprite-size";

const RED = [255, 0, 0, 255];
const CLEAR = [0, 0, 0, 0];

/** A `w × h` picture from rows of "#" (red) and "." (clear). */
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
    // Red fades out; where it's half clear, it is still pure red, just see-through.
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
