import { describe, expect, it } from "vitest";
import { hexToHsv, hsvToHex, readHex } from "@/lib/palette/hsv";

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
