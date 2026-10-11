import { describe, expect, it } from "vitest";
import { type Slice } from "@/lib/slices/slices";
import { transformPixels, transformSlices } from "@/lib/sprite/transform";
import {
  cornersOf,
  identityTransform,
  transformFloating,
} from "@/features/editor/pixel-canvas/free-transform";
import { type Floating } from "@/features/editor/pixel-canvas/selection";

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

function piece(rows: string[], x = 0, y = 0): Floating {
  const w = rows[0]!.length;
  const h = rows.length;
  const pixels = new Uint8ClampedArray(w * h * 4);
  const mask = new Uint8Array(w * h);
  rows.forEach((row, ry) =>
    [...row].forEach((c, rx) => {
      if (c === ".") return;
      const i = ry * w + rx;
      mask[i] = 1;
      pixels.set([c.charCodeAt(0), 0, 0, 255], i * 4);
    }),
  );
  return { x, y, w, h, pixels, mask };
}

function rows(f: Floating) {
  return Array.from({ length: f.h }, (_, y) =>
    Array.from({ length: f.w }, (_, x) => {
      const i = y * f.w + x;
      return f.mask[i] ? String.fromCharCode(f.pixels[i * 4]!) : ".";
    }).join(""),
  );
}

const twoByTwo = piece(["ab", "cd"], 4, 6);

describe("free transform", () => {
  it("leaves the piece as it was with no change", () => {
    for (const method of ["nearest", "rotsprite"] as const) {
      const out = transformFloating(twoByTwo, {
        ...identityTransform(twoByTwo),
        method,
      });
      expect(out).toMatchObject({ x: 4, y: 6, w: 2, h: 2 });
      expect(rows(out)).toEqual(["ab", "cd"]);
    }
  });
  it("scales from the centre", () => {
    const out = transformFloating(twoByTwo, {
      ...identityTransform(twoByTwo),
      scaleX: 2,
      scaleY: 2,
      method: "nearest",
    });
    expect(out).toMatchObject({ x: 3, y: 5, w: 4, h: 4 });
    expect(rows(out)).toEqual(["aabb", "aabb", "ccdd", "ccdd"]);
  });
  it("turns by a quarter like the 90° rotation", () => {
    const out = transformFloating(twoByTwo, {
      ...identityTransform(twoByTwo),
      angle: 90,
      method: "nearest",
    });
    expect(rows(out)).toEqual(["ca", "db"]);
  });
  it("turns by any angle without new colours, into a bigger box", () => {
    const square = piece(["aaaa", "aaaa", "aaaa", "aaaa"]);
    const out = transformFloating(square, {
      ...identityTransform(square),
      angle: 45,
    });
    expect(out.w).toBe(6);
    expect(out.h).toBe(6);
    for (let i = 0; i < out.mask.length; i++)
      if (out.mask[i]) expect(out.pixels[i * 4]).toBe("a".charCodeAt(0));
    expect(out.mask[0]).toBe(0);
  });
  it("finds where the corners go", () => {
    const corners = cornersOf(twoByTwo, {
      ...identityTransform(twoByTwo),
      angle: 180,
    });
    expect(corners[0]!.x).toBeCloseTo(6);
    expect(corners[0]!.y).toBeCloseTo(8);
  });
});
