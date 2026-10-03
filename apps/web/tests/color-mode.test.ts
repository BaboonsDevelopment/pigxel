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
