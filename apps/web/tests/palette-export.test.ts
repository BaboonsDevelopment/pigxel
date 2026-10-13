import { describe, expect, it } from "vitest";
import { paletteStrip, parsePaletteFile, toHexFile } from "@/lib/palette/files";

describe("palette export", () => {
  it("writes a .hex file that reads back", () => {
    const palette = ["#ff0000", "#00ff00", "#0000ff"];
    expect(toHexFile(palette)).toBe("ff0000\n00ff00\n0000ff\n");
    expect(parsePaletteFile(toHexFile(palette))).toEqual(palette);
  });
  it("draws one pixel per colour in the strip", () => {
    const strip = paletteStrip(["#ff0000", "#00ff0080"]);
    expect(strip).toMatchObject({ w: 2, h: 1 });
    expect([...strip.rgba]).toEqual([255, 0, 0, 255, 0, 255, 0, 128]);
  });
});
