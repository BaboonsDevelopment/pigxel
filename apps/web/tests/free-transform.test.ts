import { describe, expect, it } from "vitest";
import {
  cornersOf,
  identityTransform,
  transformFloating,
} from "@/components/pixel-canvas/free-transform";
import type { Floating } from "@/components/pixel-canvas/selection";

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

const ab = piece(["ab", "cd"], 4, 6);

describe("free transform", () => {
  it("leaves the piece as it was with no change", () => {
    for (const method of ["nearest", "rotsprite"] as const) {
      const out = transformFloating(ab, { ...identityTransform(ab), method });
      expect(out).toMatchObject({ x: 4, y: 6, w: 2, h: 2 });
      expect(rows(out)).toEqual(["ab", "cd"]);
    }
  });
  it("scales from the centre", () => {
    const out = transformFloating(ab, {
      ...identityTransform(ab),
      scaleX: 2,
      scaleY: 2,
      method: "nearest",
    });
    expect(out).toMatchObject({ x: 3, y: 5, w: 4, h: 4 });
    expect(rows(out)).toEqual(["aabb", "aabb", "ccdd", "ccdd"]);
  });
  it("turns by a quarter like the 90° rotation", () => {
    const out = transformFloating(ab, {
      ...identityTransform(ab),
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
    const corners = cornersOf(ab, { ...identityTransform(ab), angle: 180 });
    expect(corners[0]!.x).toBeCloseTo(6);
    expect(corners[0]!.y).toBeCloseTo(8);
  });
});
