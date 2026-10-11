import { describe, expect, it } from "vitest";
import { paintGradient, type Rgba } from "@/features/editor/pixel-canvas/paint";

const red: Rgba = [255, 0, 0, 255];
const green: Rgba = [0, 255, 0, 255];
const blue: Rgba = [0, 0, 255, 255];
const pixel = (data: Uint8ClampedArray, x: number) => [
  ...data.slice(x * 4, x * 4 + 4),
];

describe("multicolour gradients", () => {
  it("restricts palette-only gradients to supplied colours in every mode", () => {
    for (const dither of ["none", "bayer4", "bayer8"] as const) {
      const data = new Uint8ClampedArray(17 * 4);
      paintGradient(
        data,
        { x: 0, y: 0 },
        { x: 16, y: 0 },
        red,
        blue,
        "linear",
        dither,
        { size: { w: 17, h: 1 }, mask: null },
        [green],
        true,
      );
      for (let x = 0; x < 17; x++)
        expect([red, green, blue]).toContainEqual(pixel(data, x));
      expect(pixel(data, 0)).toEqual(red);
      expect(pixel(data, 8)).toEqual(green);
      expect(pixel(data, 16)).toEqual(blue);
    }
  });
  it("passes through intermediate colours and mixes each adjacent pair", () => {
    const data = new Uint8ClampedArray(5 * 4);
    paintGradient(
      data,
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      red,
      blue,
      "linear",
      "none",
      { size: { w: 5, h: 1 }, mask: null },
      [green],
    );
    expect(pixel(data, 0)).toEqual(red);
    expect(pixel(data, 1)).toEqual([128, 128, 0, 255]);
    expect(pixel(data, 2)).toEqual(green);
    expect(pixel(data, 3)).toEqual([0, 128, 128, 255]);
    expect(pixel(data, 4)).toEqual(blue);
  });
  it("uses only the supplied colours for dithering and respects selection", () => {
    for (const dither of ["bayer4", "bayer8"] as const) {
      const data = new Uint8ClampedArray(9 * 4);
      paintGradient(
        data,
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        red,
        blue,
        "linear",
        dither,
        {
          size: { w: 9, h: 1 },
          mask: new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 0]),
        },
        [green],
      );
      for (let x = 0; x < 8; x++)
        expect([red, green, blue]).toContainEqual(pixel(data, x));
      expect(pixel(data, 4)).toEqual(green);
      expect(pixel(data, 8)).toEqual([0, 0, 0, 0]);
    }
  });
  it("supports radial gradients and reversed sequences", () => {
    const data = new Uint8ClampedArray(5 * 4);
    paintGradient(
      data,
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      blue,
      red,
      "radial",
      "none",
      { size: { w: 5, h: 1 }, mask: null },
      [green],
    );
    expect(pixel(data, 0)).toEqual(blue);
    expect(pixel(data, 2)).toEqual(green);
    expect(pixel(data, 4)).toEqual(red);
  });
});
