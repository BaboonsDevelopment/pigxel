import { describe, expect, it } from "vitest";
import { outlined, replacedColor } from "@/components/pixel-canvas/effects";
import {
  inPattern,
  paintPoints,
  paintStamp,
  shadingInk,
  type PaintOptions,
} from "@/components/pixel-canvas/paint";
import { brushTip } from "@/components/pixel-canvas/pen";
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
