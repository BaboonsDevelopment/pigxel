import { describe, expect, it } from "vitest";
import {
  brushOrigin,
  brushTip,
  clampPenSize,
  extendStroke,
  fillPoints,
  linePoints,
  pixelColor,
  pixelPerfect,
  snapLine,
  strokePixels,
  DEFAULT_PEN,
  type Point,
} from "@/components/pixel-canvas/pen";

const p = (x: number, y: number): Point => ({ x, y });

describe("linePoints", () => {
  it("includes both ends", () => {
    expect(linePoints(p(2, 2), p(2, 2))).toEqual([p(2, 2)]);
    expect(linePoints(p(0, 0), p(3, 0))).toEqual([
      p(0, 0),
      p(1, 0),
      p(2, 0),
      p(3, 0),
    ]);
  });
  it("draws diagonals and lines in every direction without gaps", () => {
    expect(linePoints(p(3, 3), p(0, 0))).toEqual([
      p(3, 3),
      p(2, 2),
      p(1, 1),
      p(0, 0),
    ]);
    for (const end of [p(7, 3), p(-5, 9), p(-8, -2), p(4, -11)]) {
      const line = linePoints(p(0, 0), end);
      expect(line.at(-1)).toEqual(end);
      expect(line).toHaveLength(Math.max(Math.abs(end.x), Math.abs(end.y)) + 1);
      for (let i = 1; i < line.length; i++) {
        expect(Math.abs(line[i]!.x - line[i - 1]!.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(line[i]!.y - line[i - 1]!.y)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("extendStroke", () => {
  it("fills the gap between far-apart pointer events", () => {
    expect(extendStroke([p(0, 0)], p(4, 0))).toEqual([
      p(0, 0),
      p(1, 0),
      p(2, 0),
      p(3, 0),
      p(4, 0),
    ]);
  });
  it("ignores a pointer move within the same pixel", () => {
    const stroke = [p(1, 1)];
    expect(extendStroke(stroke, p(1, 1))).toBe(stroke);
  });
  it("starts a new stroke", () => {
    expect(extendStroke([], p(5, 6))).toEqual([p(5, 6)]);
  });
});

describe("pixelPerfect", () => {
  it("removes the corner pixel of an L-shaped step", () => {
    expect(pixelPerfect([p(0, 0), p(1, 0), p(1, 1)])).toEqual([
      p(0, 0),
      p(1, 1),
    ]);
  });
  it("keeps straight lines and real corners", () => {
    const straight = [p(0, 0), p(1, 0), p(2, 0)];
    expect(pixelPerfect(straight)).toEqual(straight);
    const corner = [p(0, 0), p(1, 0), p(2, 0), p(2, 1), p(2, 2)];
    expect(pixelPerfect(corner)).toEqual([p(0, 0), p(1, 0), p(2, 1), p(2, 2)]);
  });
  it("turns a staircase into a clean diagonal", () => {
    const stairs = [p(0, 0), p(1, 0), p(1, 1), p(2, 1), p(2, 2)];
    expect(pixelPerfect(stairs)).toEqual([p(0, 0), p(1, 1), p(2, 2)]);
  });
});

describe("brush", () => {
  it("centres the square brush on the pointer", () => {
    expect(brushOrigin(p(5, 5), 1)).toEqual(p(5, 5));
    expect(brushOrigin(p(5, 5), 3)).toEqual(p(4, 4));
    expect(brushOrigin(p(5, 5), 4)).toEqual(p(4, 4));
  });
  it("keeps the size within 1–16", () => {
    expect(clampPenSize(0)).toBe(1);
    expect(clampPenSize(40)).toBe(16);
    expect(clampPenSize(2.6)).toBe(3);
  });
  it("applies pixel-perfect only to 1px strokes when it is on", () => {
    const stroke = [p(0, 0), p(1, 0), p(1, 1)];
    expect(strokePixels(stroke, DEFAULT_PEN)).toHaveLength(2);
    expect(strokePixels(stroke, { ...DEFAULT_PEN, size: 2 })).toHaveLength(3);
    expect(
      strokePixels(stroke, { ...DEFAULT_PEN, pixelPerfect: false }),
    ).toHaveLength(3);
  });
});

/** An image drawn from rows of letters: r(ed), b(lue) or "." for transparent. */
function image(rows: string[]): ImageData {
  const colors: Record<string, number[]> = {
    ".": [0, 0, 0, 0],
    r: [255, 0, 0, 255],
    b: [0, 0, 255, 255],
  };
  const data = new Uint8ClampedArray(
    rows.flatMap((row) => [...row].flatMap((c) => colors[c]!)),
  );
  return { width: rows[0]!.length, height: rows.length, data } as ImageData;
}

describe("brushTip", () => {
  const covered = (size: number) =>
    brushTip(size, true).reduce((sum, r) => sum + r.w * r.h, 0);
  it("is one square for a square tip", () => {
    expect(brushTip(4, false)).toEqual([{ dx: 0, dy: 0, w: 4, h: 4 }]);
  });
  it("rounds off the corners of a round tip", () => {
    expect(covered(1)).toBe(1);
    expect(covered(2)).toBe(4);
    expect(covered(3)).toBe(5);
    expect(covered(4)).toBe(12);
    expect(brushTip(5, true).map((r) => r.w)).toEqual([3, 5, 5, 5, 3]);
  });
});

describe("snapLine", () => {
  it("snaps to horizontal, vertical and diagonal lines", () => {
    expect(snapLine(p(0, 0), p(10, 2))).toEqual(p(10, 0));
    expect(snapLine(p(0, 0), p(-2, 10))).toEqual(p(0, 10));
    expect(snapLine(p(0, 0), p(-9, 7))).toEqual(p(-9, 9));
  });
});

describe("fillPoints", () => {
  const img = image(["rr.", "b.r", "rrr"]);
  it("fills the connected same-coloured area", () => {
    expect(fillPoints(img, p(0, 0), true).sort()).toEqual([0, 1]);
    expect(fillPoints(img, p(2, 0), true).sort()).toEqual([2]);
  });
  it("fills every pixel of that colour when not contiguous", () => {
    expect(fillPoints(img, p(0, 0), false)).toEqual([0, 1, 5, 6, 7, 8]);
  });
  it("does not wrap around the image edges", () => {
    expect(fillPoints(image(["r.", ".r"]), p(1, 1), true)).toEqual([3]);
  });
});

describe("pixelColor", () => {
  it("reads a pixel's colour, or null when transparent", () => {
    const img = image(["rb."]);
    expect(pixelColor(img, p(0, 0))).toBe("#ff0000");
    expect(pixelColor(img, p(1, 0))).toBe("#0000ff");
    expect(pixelColor(img, p(2, 0))).toBeNull();
  });
});
