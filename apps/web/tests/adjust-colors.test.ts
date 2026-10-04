import { describe, expect, it } from "vitest";
import {
  adjustedBrightnessContrast,
  adjustedHueSaturation,
} from "@/features/editor/pixel-canvas/effects";

const pixels = () =>
  new Uint8ClampedArray([
    ...[255, 0, 0, 255],
    ...[128, 128, 128, 255],
    ...[0, 255, 0, 0],
  ]);

describe("hue / saturation", () => {
  it("shifts the hue and leaves clear pixels alone", () => {
    const out = adjustedHueSaturation(pixels(), null, {
      hue: 120,
      saturation: 0,
      lightness: 0,
    });
    expect([...out.slice(0, 4)]).toEqual([0, 255, 0, 255]);
    expect([...out.slice(8)]).toEqual([0, 255, 0, 0]);
  });
  it("removes colour at -100 saturation", () => {
    const out = adjustedHueSaturation(pixels(), null, {
      hue: 0,
      saturation: -100,
      lightness: 0,
    });
    expect([...out.slice(0, 4)]).toEqual([128, 128, 128, 255]);
  });
  it("changes only pixels in the mask", () => {
    const out = adjustedHueSaturation(pixels(), new Uint8Array([0, 1, 0]), {
      hue: 0,
      saturation: 0,
      lightness: 100,
    });
    expect([...out.slice(0, 8)]).toEqual([255, 0, 0, 255, 255, 255, 255, 255]);
  });
});

describe("brightness / contrast", () => {
  it("does nothing at zero", () => {
    expect([
      ...adjustedBrightnessContrast(pixels(), null, {
        brightness: 0,
        contrast: 0,
      }),
    ]).toEqual([...pixels()]);
  });
  it("brightens and pushes contrast away from grey", () => {
    const bright = adjustedBrightnessContrast(pixels(), null, {
      brightness: 20,
      contrast: 0,
    });
    expect([...bright.slice(4, 8)]).toEqual([179, 179, 179, 255]);
    const contrast = adjustedBrightnessContrast(pixels(), null, {
      brightness: 0,
      contrast: 50,
    });
    expect(contrast[0]).toBe(255);
    expect(contrast[4]).toBe(128);
  });
});
