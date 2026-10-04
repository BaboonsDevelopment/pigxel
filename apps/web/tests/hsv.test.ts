import { describe, expect, it } from "vitest";
import {
  hexToHsv,
  hslToHsv,
  hsvToHex,
  hsvToHsl,
  readHex,
  shadesOf,
} from "@/lib/palette/hsv";

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
