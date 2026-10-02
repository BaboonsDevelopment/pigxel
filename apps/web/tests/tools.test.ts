import { describe, expect, it } from "vitest";
import { outlined, replacedColor } from "@/components/pixel-canvas/effects";
import {
  blurInk,
  jumbleInk,
  gradientAt,
  inPattern,
  paintGradient,
  paintPoints,
  paintStamp,
  shadingInk,
  type PaintOptions,
} from "@/components/pixel-canvas/paint";
import {
  brushTip,
  sprayDotCount,
  sprayDots,
  curvePoints,
} from "@/components/pixel-canvas/pen";
import { onionFrames } from "@/components/pixel-canvas/view";
import { parsePaletteFile, toGpl } from "@/lib/palette/files";

const size = { w: 3, h: 3 };
const options: PaintOptions = {
  size,
  symmetry: "none",
  tiled: "none",
  mask: null,
};
const RED = [255, 0, 0, 255] as const;
const BLACK = [0, 0, 0, 255] as const;

const painted = (data: Uint8ClampedArray, w = size.w) =>
  Array.from({ length: data.length / 4 / w }, (_, y) =>
    Array.from({ length: w }, (_, x) =>
      data[(y * w + x) * 4 + 3] ? "#" : ".",
    ).join(""),
  );

const blank = () => new Uint8ClampedArray(size.w * size.h * 4);

describe("dither", () => {
  it("paints an even pattern of the density asked for", () => {
    const count = (density: number) => {
      let n = 0;
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) if (inPattern(x, y, density)) n++;
      return n;
    };
    expect(count(100)).toBe(16);
    expect(count(75)).toBe(12);
    expect(count(50)).toBe(8);
    expect(count(25)).toBe(4);
    // 50% is a checkerboard.
    expect(inPattern(0, 0, 50)).not.toBe(inPattern(1, 0, 50));
  });
  it("applies to strokes", () => {
    const data = blank();
    const all = Array.from({ length: 9 }, (_, i) => ({
      x: i % 3,
      y: Math.floor(i / 3),
    }));
    paintPoints(data, all, brushTip(1, false), (p) => p, RED, {
      ...options,
      density: 50,
    });
    expect(painted(data)).toEqual(["#.#", ".#.", "#.#"]);
  });
});

describe("shading ink", () => {
  const palette = ["#000000", "#808080", "#ffffff"];
  it("moves palette colours one step and leaves others alone", () => {
    const before = blank();
    before.set([128, 128, 128, 255], 0);
    before.set([255, 255, 255, 255], 4);
    before.set([1, 2, 3, 255], 8);
    const forward = shadingInk(before, palette, 1);
    const back = shadingInk(before, palette, -1);
    if (typeof forward !== "function" || typeof back !== "function")
      throw new Error("expected a function");
    expect(forward(0)).toEqual([255, 255, 255, 255]);
    expect(back(0)).toEqual([0, 0, 0, 255]);
    // The end of the palette stays.
    expect(forward(1)).toEqual([255, 255, 255, 255]);
    expect(forward(2)).toBeNull();
    // Transparent pixels aren't shaded.
    expect(forward(3)).toBeNull();
  });
});

describe("picture brush", () => {
  it("stamps its own colours, centred, skipping transparent pixels", () => {
    const stamp = {
      w: 2,
      h: 1,
      pixels: new Uint8ClampedArray([...RED, 0, 0, 0, 0]),
    };
    const data = blank();
    paintStamp(data, [{ x: 1, y: 1 }], stamp, null, options);
    expect(painted(data)).toEqual(["...", ".#.", "..."]);
    expect([...data.slice(16, 20)]).toEqual([...RED]);
  });
  it("paints a silhouette in one colour", () => {
    const stamp = { w: 1, h: 1, pixels: new Uint8ClampedArray(RED) };
    const data = blank();
    paintStamp(data, [{ x: 0, y: 0 }], stamp, BLACK, options);
    expect([...data.slice(0, 4)]).toEqual([...BLACK]);
  });
});

describe("curve", () => {
  it("runs from end to end without gaps or doubled pixels", () => {
    const start = { x: 0, y: 10 };
    const end = { x: 12, y: 10 };
    const points = curvePoints(start, { x: 2, y: 0 }, { x: 10, y: 0 }, end);
    expect(points[0]).toEqual(start);
    expect(points.at(-1)).toEqual(end);
    for (let i = 1; i < points.length; i++) {
      const step = Math.max(
        Math.abs(points[i]!.x - points[i - 1]!.x),
        Math.abs(points[i]!.y - points[i - 1]!.y),
      );
      expect(step).toBe(1);
    }
    // Bent towards the controls, above the straight line between the ends.
    expect(Math.min(...points.map((p) => p.y))).toBeLessThan(6);
  });
  it("is a straight line while the controls sit on the ends", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 5, y: 0 };
    expect(curvePoints(start, start, end, end)).toEqual(
      [0, 1, 2, 3, 4, 5].map((x) => ({ x, y: 0 })),
    );
  });
});

describe("blur", () => {
  it("averages each pixel with its neighbours, from before the stroke", () => {
    const wide = { w: 3, h: 1 };
    const before = new Uint8ClampedArray([...BLACK, ...BLACK, ...RED]);
    const ink = blurInk(before, wide) as (i: number) => readonly number[];
    expect(ink(0)).toEqual([0, 0, 0, 255]);
    expect(ink(1)).toEqual([85, 0, 0, 255]);
    expect(ink(2)).toEqual([128, 0, 0, 255]);
  });
  it("fades an edge into transparency without darkening it", () => {
    const wide = { w: 2, h: 1 };
    const before = new Uint8ClampedArray([...RED, 0, 0, 0, 0]);
    const ink = blurInk(before, wide) as (i: number) => readonly number[];
    expect(ink(1)).toEqual([255, 0, 0, 128]);
    // Nothing to blur where everything around is transparent.
    expect(blurInk(new Uint8ClampedArray(8), wide)).toBeTypeOf("function");
    expect(
      (blurInk(new Uint8ClampedArray(8), wide) as (i: number) => unknown)(0),
    ).toBeNull();
  });
});

describe("jumble", () => {
  it("moves colours around without making new ones, the same on every redraw", () => {
    const tile = { w: 6, h: 6 };
    const before = new Uint8ClampedArray(tile.w * tile.h * 4);
    for (let i = 0; i < tile.w * tile.h; i++)
      before.set(i % tile.w < 3 ? RED : BLACK, i * 4);
    const ink = jumbleInk(before, tile, 7) as (i: number) => number[] | null;
    const picked = Array.from({ length: tile.w * tile.h }, (_, i) => ink(i));
    for (const rgba of picked)
      if (rgba) expect([RED.join(), BLACK.join()]).toContain(rgba.join());
    // Some pixels on the edge between the two colours swapped sides.
    expect(picked.some((rgba, i) => rgba && rgba[0] !== before[i * 4])).toBe(
      true,
    );
    const again = jumbleInk(before, tile, 7) as (i: number) => unknown;
    expect(picked.map((_, i) => again(i))).toEqual(picked);
  });
});

describe("spray", () => {
  it("scatters dots inside the circle around the pointer", () => {
    let seed = 1;
    const random = () =>
      ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const dots = sprayDots({ x: 10, y: 10 }, 3, 500, random);
    expect(dots).toHaveLength(500);
    for (const { x, y } of dots)
      expect(Math.hypot(x - 10, y - 10)).toBeLessThanOrEqual(
        3.5 + Math.SQRT1_2,
      );
    // Spread over the circle, not stuck in one spot.
    expect(new Set(dots.map((d) => `${d.x},${d.y}`)).size).toBeGreaterThan(20);
  });
  it("lays dots in proportion to speed and time held", () => {
    expect(sprayDotCount(100, 1)).toBe(2 * sprayDotCount(50, 1));
    expect(sprayDotCount(40, 0.5)).toBe(sprayDotCount(40, 1) / 2);
  });
});

describe("gradient", () => {
  const wide = { w: 4, h: 1 };
  const row = (data: Uint8ClampedArray) =>
    Array.from({ length: data.length / 4 }, (_, i) => data[i * 4]!);
  const from = { x: 0, y: 0 };
  const to = { x: 3, y: 0 };

  it("measures how far along the line, or from the centre, a pixel is", () => {
    expect(
      [0, 1, 2, 3].map((x) => gradientAt(x, 0, from, to, "linear")),
    ).toEqual([0, 1 / 3, 2 / 3, 1]);
    // Pixels before the start and past the end keep the end colours.
    expect(gradientAt(-2, 0, from, to, "linear")).toBe(0);
    expect(gradientAt(5, 0, from, to, "linear")).toBe(1);
    expect(gradientAt(0, 3, from, to, "radial")).toBe(1);
  });
  it("mixes the colours smoothly without a dither", () => {
    const data = new Uint8ClampedArray(wide.w * 4);
    paintGradient(data, from, to, BLACK, RED, "linear", "none", {
      size: wide,
      mask: null,
    });
    expect(row(data)).toEqual([0, 85, 170, 255]);
  });
  it("keeps to the two colours with a dither, and stays in the selection", () => {
    const data = new Uint8ClampedArray(wide.w * 4);
    const mask = new Uint8Array([1, 1, 1, 0]);
    paintGradient(data, from, to, BLACK, RED, "linear", "bayer4", {
      size: wide,
      mask,
    });
    expect(
      row(data)
        .slice(0, 3)
        .every((v) => v === 0 || v === 255),
    ).toBe(true);
    expect(row(data)[0]).toBe(0);
    expect(data[3 * 4 + 3]).toBe(0);
  });
});

describe("effects", () => {
  const dot = () => {
    const data = blank();
    data.set(RED, 4 * 4);
    return data;
  };
  it("outlines what is drawn, sideways or with corners", () => {
    expect(painted(outlined(dot(), size, BLACK, null))).toEqual([
      ".#.",
      "###",
      ".#.",
    ]);
    expect(painted(outlined(dot(), size, BLACK, null, true))).toEqual([
      "###",
      "###",
      "###",
    ]);
  });
  it("replaces one colour with another, inside the selection", () => {
    const mask = new Uint8Array(9);
    const out = replacedColor(dot(), RED, BLACK, null);
    expect([...out.slice(16, 20)]).toEqual([...BLACK]);
    const outside = replacedColor(dot(), RED, BLACK, mask);
    expect([...outside.slice(16, 20)]).toEqual([...RED]);
  });
});

describe("palette files", () => {
  it("reads GIMP palettes", () => {
    const gpl =
      "GIMP Palette\nName: Test\nColumns: 4\n#\n255   0   0\tRed\n  0  16 255 Blue\n";
    expect(parsePaletteFile(gpl)).toEqual(["#ff0000", "#0010ff"]);
  });
  it("reads .hex and Paint.NET files", () => {
    expect(parsePaletteFile("ff0000\n#00FF00\n\n")).toEqual([
      "#ff0000",
      "#00ff00",
    ]);
    expect(parsePaletteFile("; paint.net\nFFFF0000\nFF0000FF")).toEqual([
      "#ff0000",
      "#0000ff",
    ]);
    expect(parsePaletteFile("hello")).toBeNull();
  });
  it("writes GIMP palettes that read back the same", () => {
    const palette = ["#ff0000", "#0a0b0c"];
    expect(parsePaletteFile(toGpl(palette, "Mine"))).toEqual(palette);
  });
});

describe("onion skin", () => {
  it("shows the nearest frames on each side, the nearest strongest", () => {
    expect(onionFrames(2, 1, 4)).toEqual([
      { index: 0, before: true, strength: 1 },
      { index: 2, before: false, strength: 1 },
      { index: 3, before: false, strength: 0.5 },
    ]);
    expect(onionFrames(0, 1, 4)).toEqual([]);
  });
});
