import { describe, expect, it } from "vitest";
import type { Bitmap } from "@/lib/image/bitmap";
import { lineArtKind } from "@/lib/image/line-art";
import { shrinkToTile } from "@/lib/image/steps/shrink-to-tile";
import {
  GENERATED_PICTURE_STEPS,
  REDRAWN_PICTURE_STEPS,
  SCENE_PICTURE_STEPS,
  runSteps,
} from "@/lib/image/pipeline";

const size = 1024;
const target = { w: 256, h: 256 };
const black = [0, 0, 0, 255];
const white = [255, 255, 255, 255];
const clear = [0, 0, 0, 0];
const at = (image: Bitmap, x: number, y: number) => [
  ...image.rgba.subarray((y * image.w + x) * 4, (y * image.w + x) * 4 + 4),
];

// One-source-pixel strokes at different angles and subpixel phases: the curves
// cross many output cells without occupying most of any cell's area.
const drawing = (paper: number[], ink: number[]) => {
  const image: Bitmap = {
    w: size,
    h: size,
    rgba: new Uint8ClampedArray(size * size * 4),
  };
  for (let p = 0; p < image.rgba.length; p += 4) image.rgba.set(paper, p);
  const strokes: [number, number][] = [];
  const put = (x: number, y: number) => {
    image.rgba.set(ink, (y * size + x) * 4);
    strokes.push([x, y]);
  };
  for (let x = 24; x < 1000; x++) {
    put(x, 80 + Math.floor(x * 0.37));
    put(x, 650 + Math.round(35 * Math.sin(x / 85)));
  }
  for (let y = 30; y < 990; y++) put(20 + Math.floor(y * 0.13), y);
  return { image, strokes };
};
const expectStrokes = (
  image: Bitmap,
  strokes: [number, number][],
  ink: number[],
) => {
  const missing = strokes.filter(
    ([x, y]) =>
      at(image, Math.floor(x / 4), Math.floor(y / 4)).join() !== ink.join(),
  );
  expect(missing).toHaveLength(0);
};

describe("reducing thin line drawings", () => {
  it.each([
    ["black on white", white, black],
    ["white on black", black, white],
    ["gray on white", white, [175, 175, 175, 255]],
    ["transparent", clear, black],
  ] as const)("keeps continuous %s strokes at 256×256", (_name, paper, ink) => {
    const { image, strokes } = drawing([...paper], [...ink]);
    const original = new Uint8ClampedArray(image.rgba);
    const reduced = shrinkToTile(image, target);
    expectStrokes(reduced, strokes, [...ink]);
    expect(at(reduced, 250, 10)).toEqual([...paper]);
    expect(image.rgba.every((value, i) => value === original[i])).toBe(true);
  });

  it("preserves line positions through generation, scene and redraw conversion", () => {
    const { image, strokes } = drawing(white, black);
    for (const steps of [
      GENERATED_PICTURE_STEPS,
      SCENE_PICTURE_STEPS,
      REDRAWN_PICTURE_STEPS,
    ])
      expectStrokes(runSteps(image, target, steps), strokes, black);
  });

  it("preserves the original pixels when the image already fits the tile", () => {
    const image: Bitmap = {
      w: 16,
      h: 16,
      rgba: new Uint8ClampedArray(16 * 16 * 4),
    };
    for (let i = 0; i < 256; i++) image.rgba.set(white, i * 4);
    for (let y = 1; y < 15; y++) image.rgba.set(black, (y * 16 + 3) * 4);
    expect(shrinkToTile(image, image).rgba).toEqual(image.rgba);
  });

  it("uses normal sampling for coloured sprites and grayscale shaded material", () => {
    const colourful: Bitmap = {
      w: 16,
      h: 16,
      rgba: new Uint8ClampedArray(16 * 16 * 4),
    };
    for (let i = 0; i < 256; i++)
      colourful.rgba.set([150, 20, 210, 255], i * 4);
    expect(lineArtKind(colourful)).toBeNull();
    for (let i = 0; i < 256; i++) colourful.rgba.set([80, 80, 80, 255], i * 4);
    expect(lineArtKind(colourful)).toBeNull();
    expect(at(shrinkToTile(colourful, { w: 8, h: 8 }), 3, 3)).toEqual([
      80, 80, 80, 255,
    ]);
  });
});
