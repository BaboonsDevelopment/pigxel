import { describe, expect, it } from "vitest";
import { brushTip } from "@/components/pixel-canvas/pen";
import {
  mirrored,
  paintPoints,
  wrapPixel,
  type PaintOptions,
} from "@/components/pixel-canvas/paint";
import {
  combineMasks,
  flipFloating,
  floatingMask,
  invertMask,
  liftPixels,
  maskBounds,
  maskOutline,
  polygonMask,
  rectMask,
  rotateFloating,
  selectModeOf,
  stampFloating,
  wandMask,
} from "@/components/pixel-canvas/selection";
import {
  DEFAULT_PALETTE,
  colorsOf,
  pushRecent,
  readPalette,
} from "@/lib/palette/presets";

const size = { w: 4, h: 3 };
const RED = [255, 0, 0, 255] as const;

/** The mask as rows of "#" (selected) and "." for easy reading. */
const rows = (mask: Uint8Array | null, w = size.w) =>
  mask
    ? Array.from({ length: mask.length / w }, (_, y) =>
        [...mask.slice(y * w, y * w + w)].map((v) => (v ? "#" : ".")).join(""),
      )
    : null;

/** Which pixels of an RGBA buffer are painted, as rows. */
const painted = (data: Uint8ClampedArray, w = size.w) =>
  Array.from({ length: data.length / 4 / w }, (_, y) =>
    Array.from({ length: w }, (_, x) =>
      data[(y * w + x) * 4 + 3] ? "#" : ".",
    ).join(""),
  );

const options = (patch: Partial<PaintOptions> = {}): PaintOptions => ({
  size,
  symmetry: "none",
  tiled: "none",
  mask: null,
  ...patch,
});

const dot = (x: number, y: number, opts: PaintOptions) => {
  const data = new Uint8ClampedArray(size.w * size.h * 4);
  paintPoints(data, [{ x, y }], brushTip(1, false), (p) => p, RED, opts);
  return painted(data);
};

describe("painting", () => {
  it("mirrors strokes across the middle of the tile", () => {
    expect(mirrored({ x: 0, y: 0 }, size, "both")).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 2 },
      { x: 3, y: 2 },
    ]);
    expect(dot(0, 0, options({ symmetry: "horizontal" }))).toEqual([
      "#..#",
      "....",
      "....",
    ]);
  });
  it("wraps around the edges in tiled mode, and clips otherwise", () => {
    expect(wrapPixel(-1, 5, size, "both")).toEqual({ x: 3, y: 2 });
    expect(wrapPixel(-1, 1, size, "y")).toBeNull();
    expect(dot(4, 1, options({ tiled: "x" }))).toEqual([
      "....",
      "#...",
      "....",
    ]);
    expect(dot(4, 1, options())).toEqual(["....", "....", "...."]);
  });
  it("paints only inside the selection", () => {
    const mask = rectMask(size, { x: 0, y: 0, w: 2, h: 3 });
    expect(dot(3, 0, options({ mask, symmetry: "horizontal" }))).toEqual([
      "#...",
      "....",
      "....",
    ]);
  });
});

describe("selections", () => {
  it("reads the mode from the keys held, as in Aseprite", () => {
    expect(selectModeOf({ shiftKey: false, altKey: false })).toBe("replace");
    expect(selectModeOf({ shiftKey: true, altKey: false })).toBe("add");
    expect(selectModeOf({ shiftKey: false, altKey: true })).toBe("subtract");
    expect(selectModeOf({ shiftKey: true, altKey: true })).toBe("intersect");
  });
  it("combines rectangles", () => {
    const left = rectMask(size, { x: 0, y: 0, w: 2, h: 3 });
    const top = rectMask(size, { x: 0, y: 0, w: 4, h: 1 });
    expect(rows(combineMasks(left, top, "add"))).toEqual([
      "####",
      "##..",
      "##..",
    ]);
    expect(rows(combineMasks(left, top, "subtract"))).toEqual([
      "....",
      "##..",
      "##..",
    ]);
    expect(rows(combineMasks(left, top, "intersect"))).toEqual([
      "##..",
      "....",
      "....",
    ]);
    expect(combineMasks(top, top, "subtract")).toBeNull();
    expect(rows(invertMask(left, size))).toEqual(["..##", "..##", "..##"]);
    expect(maskBounds(left, size)).toEqual({ x: 0, y: 0, w: 2, h: 3 });
  });
  it("fills a lasso outline", () => {
    const big = { w: 5, h: 5 };
    const square = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ];
    expect(rows(polygonMask(big, square), 5)).toEqual(Array(5).fill("#####"));
    const triangle = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 4 },
    ];
    expect(rows(polygonMask(big, triangle), 5)).toEqual([
      "#####",
      "####.",
      "###..",
      "##...",
      "#....",
    ]);
  });
  it("picks a colour area with the magic wand", () => {
    const cel = new Uint8ClampedArray(size.w * size.h * 4);
    for (const i of [0, 1, 3]) cel.set(RED, i * 4);
    expect(rows(wandMask(cel, size, { x: 0, y: 0 }, true))).toEqual([
      "##..",
      "....",
      "....",
    ]);
    expect(rows(wandMask(cel, size, { x: 0, y: 0 }, false))).toEqual([
      "##.#",
      "....",
      "....",
    ]);
  });
  it("outlines the selection along its edges", () => {
    const one = rectMask(size, { x: 1, y: 1, w: 1, h: 1 });
    expect(maskOutline(one, size)).toBe("M1 1H2M1 2H2M1 1V2M2 1V2");
  });
});

describe("floating pixels", () => {
  // A 3×2 cel: a red pixel at (0, 0) and (1, 0).
  const small = { w: 3, h: 2 };
  const cel = new Uint8ClampedArray(small.w * small.h * 4);
  cel.set(RED, 0);
  cel.set(RED, 4);
  const selected = rectMask(small, { x: 0, y: 0, w: 2, h: 1 });

  it("lifts, moves and stamps back the selected pixels", () => {
    const lifted = liftPixels(cel, small, selected, null)!;
    expect(painted(lifted.under, 3)).toEqual(["...", "..."]);
    const moved = { ...lifted.floating, x: 1, y: 1 };
    expect(painted(stampFloating(lifted.under, small, moved), 3)).toEqual([
      "...",
      ".##",
    ]);
    expect(rows(floatingMask(moved, small), 3)).toEqual(["...", ".##"]);
  });
  it("leaves the Background colour behind", () => {
    const lifted = liftPixels(cel, small, selected, [9, 9, 9, 255])!;
    expect([...lifted.under.slice(0, 4)]).toEqual([9, 9, 9, 255]);
  });
  it("flips and turns a piece around its middle", () => {
    const piece = {
      x: 0,
      y: 0,
      w: 2,
      h: 1,
      pixels: new Uint8ClampedArray([1, 0, 0, 255, 2, 0, 0, 255]),
      mask: new Uint8Array([1, 1]),
    };
    expect([...flipFloating(piece, "horizontal").pixels]).toEqual([
      2, 0, 0, 255, 1, 0, 0, 255,
    ]);
    const turned = rotateFloating(piece, true);
    // Standing up around its middle, it reaches one pixel higher.
    expect(turned).toMatchObject({ w: 1, h: 2, x: 0, y: -1 });
    expect([...turned.pixels]).toEqual([1, 0, 0, 255, 2, 0, 0, 255]);
    expect([...rotateFloating(piece, false).pixels]).toEqual([
      2, 0, 0, 255, 1, 0, 0, 255,
    ]);
  });
});

describe("palettes", () => {
  it("reads colours from a file, dropping bad ones", () => {
    expect(readPalette(["#ABCDEF", "#abcdef", "nope"])).toEqual(["#abcdef"]);
    expect(readPalette("nope")).toBeNull();
    expect(DEFAULT_PALETTE).toHaveLength(16);
  });
  it("lists a picture's colours, most used first", () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 255, 255, 255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0,
    ]);
    expect(colorsOf(pixels)).toEqual(["#ff0000", "#0000ff"]);
  });
  it("keeps recent colours newest first, without repeats", () => {
    expect(pushRecent(["#111111", "#222222"], "#222222")).toEqual([
      "#222222",
      "#111111",
    ]);
    expect(pushRecent(["#1", "#2"], "#3", 2)).toEqual(["#3", "#1"]);
  });
});
