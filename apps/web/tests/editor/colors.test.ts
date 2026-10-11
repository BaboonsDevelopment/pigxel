import { describe, expect, it } from "vitest";
import {
  hexToHsv,
  hslToHsv,
  hsvToHex,
  hsvToHsl,
  readHex,
  shadesOf,
  alphaOf,
  withAlpha,
} from "@/lib/palette/hsv";
import { rgbaOf } from "@/features/editor/pixel-canvas/paint";
import { pixelColor } from "@/features/editor/pixel-canvas/pen";
import { inkAlpha } from "@/features/editor/tools/shared/stroke";
import { inColorMode } from "@/lib/palette/color-mode";
import { readPalette } from "@/lib/palette/presets";

describe("colour picker maths", () => {
  it("turns colours into hue, saturation and value and back", () => {
    expect(hexToHsv("#ff0000")).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv("#00ff00").h).toBe(120);
    expect(hexToHsv("#000000")).toEqual({ h: 0, s: 0, v: 0 });
    for (const hex of ["#1d2b53", "#ff004d", "#ffffff", "#808080", "#00e436"])
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
  });
  it("reads typed colours", () => {
    expect(readHex("#ABC")).toBe("#aabbcc");
    expect(readHex(" 00ff7f ")).toBe("#00ff7f");
    expect(readHex("#12345")).toBeNull();
    expect(readHex("red")).toBeNull();
  });
});

describe("HSL and shades", () => {
  it("goes between HSV and HSL", () => {
    const hsv = hexToHsv("#ff004d");
    const back = hslToHsv(hsvToHsl(hsv));
    expect(hsvToHex(back)).toBe("#ff004d");
    expect(hsvToHsl({ h: 0, s: 1, v: 1 })).toEqual({ h: 0, s: 1, l: 0.5 });
  });
  it("makes darker and lighter shades of the same hue around the colour", () => {
    const shades = shadesOf("#cc3333");
    expect(shades).toHaveLength(7);
    expect(shades[3]).toBe("#cc3333");
    const light = (hex: string) => hsvToHsl(hexToHsv(hex)).l;
    for (let i = 1; i < shades.length; i++)
      expect(light(shades[i]!)).toBeGreaterThan(light(shades[i - 1]!));
    expect(Math.round(hexToHsv(shades[0]!).h)).toBe(0);
  });
});

describe("colours with their own alpha", () => {
  it("writes alpha only when the colour isn't fully opaque", () => {
    expect(withAlpha("#ff0000", 128)).toBe("#ff000080");
    expect(withAlpha("#ff000080", 255)).toBe("#ff0000");
    expect(alphaOf("#ff000080")).toBe(128);
    expect(alphaOf("#ff0000")).toBe(255);
  });
  it("reads typed colours with alpha", () => {
    expect(readHex("#ff000080")).toBe("#ff000080");
    expect(readHex("f008")).toBe("#ff000088");
    expect(readHex("#ff0000ff")).toBe("#ff0000");
  });
  it("paints and picks a colour's alpha", () => {
    expect(rgbaOf("#ff000080")).toEqual([255, 0, 0, 128]);
    expect(rgbaOf("#ff0000")).toEqual([255, 0, 0, 255]);
    const image = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 128]),
    } as ImageData;
    expect(pixelColor(image, { x: 0, y: 0 })).toBe("#ff000080");
    expect(inkAlpha([0, 0, 0, 128], 128)).toBe(64);
    expect(inkAlpha([0, 0, 0, 255], 255)).toBe(255);
  });
  it("keeps translucent colours in a palette as their own colours", () => {
    expect(readPalette(["#ff0000", "#FF000080", "#ff0000ff"])).toEqual([
      "#ff0000",
      "#ff000080",
    ]);
  });
  it("matches alpha too on an indexed tile with translucent colours", () => {
    const out = inColorMode(
      new Uint8ClampedArray([250, 0, 0, 120, 0, 0, 0, 0]),
      "indexed",
      ["#ff0000", "#ff000080"],
    );
    expect([...out!]).toEqual([255, 0, 0, 128, 0, 0, 0, 0]);
    expect(
      inColorMode(new Uint8ClampedArray([255, 0, 0, 100]), "indexed", [
        "#ff0000",
      ]),
    ).toEqual(new Uint8ClampedArray([0, 0, 0, 0]));
  });
});
