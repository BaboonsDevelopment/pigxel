import { describe, expect, it } from "vitest";
import {
  inColorMode,
  readColorMode,
  recolorByPlace,
} from "@/lib/palette/color-mode";
import {
  blankDocument,
  parsePigxel,
  serializePigxel,
} from "@/lib/pigxel-file/format";
import {
  countColors,
  mapToPalette,
  reducedPalette,
} from "@/lib/palette/reduce";

const pixels = (...colors: number[][]) => new Uint8ClampedArray(colors.flat());

describe("colour modes", () => {
  it("turns every pixel into the nearest palette colour in indexed mode", () => {
    const out = inColorMode(
      pixels([250, 10, 10, 255], [20, 20, 30, 200], [0, 0, 0, 40]),
      "indexed",
      ["#ff0000", "#000000"],
    );
    expect([...out!]).toEqual([
      ...[255, 0, 0, 255],
      ...[0, 0, 0, 255],
      ...[0, 0, 0, 0],
    ]);
  });
  it("changes a colour edited in the palette everywhere", () => {
    const out = inColorMode(
      pixels([255, 0, 0, 255], [0, 0, 0, 255]),
      "indexed",
      ["#0000ff", "#000000"],
      new Map([["#ff0000", "#0000ff"]]),
    );
    expect([...out!]).toEqual([...[0, 0, 255, 255], ...[0, 0, 0, 255]]);
  });
  it("leaves pixels already in the mode alone", () => {
    expect(
      inColorMode(pixels([255, 0, 0, 255]), "indexed", ["#ff0000"]),
    ).toBeNull();
    expect(inColorMode(pixels([255, 0, 0, 255]), "rgb", [])).toBeNull();
  });
  it("turns colours into greys of the same brightness", () => {
    const out = inColorMode(pixels([255, 0, 0, 128]), "grayscale", []);
    expect([...out!]).toEqual([76, 76, 76, 128]);
  });
  it("maps a loaded palette place by place", () => {
    expect([
      ...recolorByPlace(
        ["#111111", "#222222", "#333333"],
        ["#aaaaaa", "#bbbbbb"],
      ),
    ]).toEqual([
      ["#111111", "#aaaaaa"],
      ["#222222", "#bbbbbb"],
    ]);
  });
  it("reads the mode from a file, RGB when missing or unknown", () => {
    expect(readColorMode("indexed")).toBe("indexed");
    expect(readColorMode(undefined)).toBe("rgb");
    expect(readColorMode("cmyk")).toBe("rgb");
  });

  it("keeps the mode in the .pigxel file, and writes nothing for RGB", () => {
    const doc = {
      ...blankDocument(2, 2, "transparent"),
      colorMode: "indexed" as const,
    };
    expect(parsePigxel(serializePigxel(doc)).colorMode).toBe("indexed");
    expect(serializePigxel(blankDocument(2, 2, "transparent"))).not.toContain(
      "colorMode",
    );
  });
});

const gradient = () => {
  const rgba = new Uint8ClampedArray(64 * 4);
  for (let i = 0; i < 64; i++)
    rgba.set([i * 4, i * 2, 255 - i * 4, 255], i * 4);
  return rgba;
};

describe("reduce colours", () => {
  it("picks at most N colours from everything drawn", () => {
    const picture = gradient();
    expect(countColors([picture])).toBe(64);
    const palette = reducedPalette([picture], 4);
    expect(palette.length).toBeLessThanOrEqual(4);
    expect(palette.length).toBeGreaterThan(1);
    for (const color of palette) expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("maps every pixel to the palette and keeps clear pixels clear", () => {
    const rgba = new Uint8ClampedArray([250, 10, 10, 255, 0, 0, 0, 0]);
    expect([...mapToPalette(rgba, 2, ["#ff0000", "#0000ff"], "none")]).toEqual([
      255, 0, 0, 255, 0, 0, 0, 0,
    ]);
  });
  it("dithers between colours, only with palette colours", () => {
    const grey = new Uint8ClampedArray(16 * 4);
    for (let i = 0; i < 16; i++) grey.set([128, 128, 128, 255], i * 4);
    for (const dither of ["ordered", "diffusion"] as const) {
      const out = mapToPalette(grey, 4, ["#000000", "#ffffff"], dither);
      expect(countColors([out])).toBe(2);
    }
    expect(
      countColors([mapToPalette(grey, 4, ["#000000", "#ffffff"], "none")]),
    ).toBe(1);
  });
});
