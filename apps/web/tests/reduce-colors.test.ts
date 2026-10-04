import { describe, expect, it } from "vitest";
import {
  countColors,
  mapToPalette,
  reducedPalette,
} from "@/lib/palette/reduce";

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
