import { describe, expect, it } from "vitest";
import { cutOutBackground } from "@/lib/image/steps/cut-out-background";
import {
  GENERATED_PICTURE_STEPS,
  REDRAWN_PICTURE_STEPS,
  SCENE_PICTURE_STEPS,
  runSteps,
} from "@/lib/image/pipeline";
import { resizeNearest, type Bitmap } from "@/lib/image/bitmap";

const key = [255, 0, 255, 255];
const picture = (side = 12): Bitmap => ({
  w: side,
  h: side,
  rgba: new Uint8ClampedArray(
    Array.from({ length: side * side }, () => key).flat(),
  ),
});
const put = (image: Bitmap, x: number, y: number, rgba: number[]) =>
  image.rgba.set(rgba, (y * image.w + x) * 4);
const pixel = (image: Bitmap, x: number, y: number) => [
  ...image.rgba.slice((y * image.w + x) * 4, (y * image.w + x) * 4 + 4),
];

describe("sprite chroma-key separation", () => {
  it("fully removes key-hue colours clipped to canvas borders without adjacent transparent pixels", () => {
    const image = picture(64);
    const metal = [115, 108, 82, 255];
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 64; x++) put(image, x, y, metal);
    const spill = [
      [115, 4, 116, 255],
      [209, 38, 205, 255],
      [139, 20, 140, 255],
      [162, 23, 161, 255],
    ];
    for (let n = 0; n < spill.length; n++) {
      put(image, 24 + n, 0, spill[n]!);
      put(image, 0, 5 + n, spill[n]!);
      put(image, 63, 5 + n, spill[n]!);
    }
    const large = resizeNearest(image, 512, 512);
    for (const steps of [GENERATED_PICTURE_STEPS, REDRAWN_PICTURE_STEPS]) {
      const tile = runSteps(large, { w: 64, h: 64 }, steps);
      let drawn = 0;
      for (let i = 0; i < 64 * 64; i++) {
        const colour = pixel(tile, i % 64, Math.floor(i / 64));
        if (colour[3]) {
          drawn++;
          expect(colour).toEqual(metal);
        }
      }
      expect(drawn).toBeGreaterThan(1000);
    }
  });
  it("does not allow palette or later conversion steps to reintroduce a key hue absent from the artwork", () => {
    const image = picture(64);
    for (let y = 10; y < 55; y++)
      for (let x = 10; x < 55; x++) put(image, x, y, [110, 105, 80, 255]);
    const result = runSteps(image, image, [
      ...REDRAWN_PICTURE_STEPS,
      {
        rule: "A late colour conversion introduces an unwanted key-coloured pixel",
        apply: (converted) => {
          put(converted, 30, 30, [139, 20, 140, 255]);
          return converted;
        },
      },
    ]);
    expect(pixel(result, 30, 30)[3]).toBe(0);
    expect(pixel(result, 31, 30)).toEqual([110, 105, 80, 255]);
  });
  it("cleans clipped border spill even when a separate part of the artwork is genuinely purple", () => {
    const image = picture(64);
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 64; x++) put(image, x, y, [100, 95, 70, 255]);
    for (let y = 10; y < 20; y++)
      for (let x = 10; x < 20; x++) put(image, x, y, [80, 25, 115, 255]);
    put(image, 30, 0, [115, 4, 116, 255]);
    const result = runSteps(image, image, REDRAWN_PICTURE_STEPS);
    expect(pixel(result, 30, 0)[3]).toBe(0);
    expect(pixel(result, 15, 15)).toEqual([80, 25, 115, 255]);
  });
  it("leaves no magenta spill on either contour of a neutral 64×64 ring", () => {
    const image = picture(64);
    const grey = [70, 70, 75, 255];
    const spill = [
      [187, 43, 187, 255],
      [80, 0, 79, 255],
      [126, 6, 128, 255],
    ];
    const onRing = (x: number, y: number) => {
      const distance = Math.hypot(x - 31.5, y - 31.5);
      return distance >= 19 && distance <= 29;
    };
    let inner = 0,
      outer = 0;
    const usedSpill = new Set<number>();
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        if (!onRing(x, y)) continue;
        const boundary = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].some(([dx, dy]) => !onRing(x + dx!, y + dy!));
        const dirty = boundary && (x + y) % 3 === 0;
        const variant = Math.floor((x + y) / 3) % spill.length;
        put(image, x, y, dirty ? spill[variant]! : grey);
        if (dirty) {
          usedSpill.add(variant);
          if (Math.hypot(x - 31.5, y - 31.5) < 24) inner++;
          else outer++;
        }
      }
    expect(inner).toBeGreaterThan(0);
    expect(outer).toBeGreaterThan(0);
    expect(usedSpill.size).toBe(spill.length);
    const source = resizeNearest(image, 512, 512);
    const preview = cutOutBackground(source);
    const tile = runSteps(source, { w: 64, h: 64 }, REDRAWN_PICTURE_STEPS);
    for (const result of [preview, tile]) {
      let opaque = 0;
      for (let i = 0; i < result.w * result.h; i++) {
        if (!result.rgba[i * 4 + 3]) continue;
        opaque++;
        expect(pixel(result, i % result.w, Math.floor(i / result.w))).toEqual(
          grey,
        );
      }
      expect(opaque).toBeGreaterThan(0);
    }
    expect(pixel(tile, 32, 32)[3]).toBe(0);
    expect(pixel(tile, 32, 8)).toEqual(grey);
  });
  it("keeps a small purple material highlight adjoining blue-violet paint", () => {
    const image = picture(64);
    for (let y = 12; y < 50; y++)
      for (let x = 20; x < 40; x++) put(image, x, y, [80, 25, 115, 255]);
    const highlight = [187, 43, 187, 255];
    put(image, 19, 25, highlight);
    expect(pixel(cutOutBackground(image), 19, 25)).toEqual(highlight);
  });
  it("removes the darker key-coloured edge specks seen around the blood mage before building its tile palette", () => {
    const image = picture(64);
    const cloak = [40, 15, 30, 255];
    for (let y = 12; y < 50; y++)
      for (let x = 20; x < 40; x++) put(image, x, y, cloak);
    // The two visible fringe colours sampled from the reported screenshot.
    put(image, 19, 20, [225, 22, 207, 255]);
    put(image, 40, 30, [191, 24, 179, 255]);
    put(image, 40, 48, [203, 43, 185, 255]);
    const cut = cutOutBackground(image);
    expect(pixel(cut, 19, 20)[3]).toBe(0);
    expect(pixel(cut, 40, 30)[3]).toBe(0);
    expect(pixel(cut, 40, 48)[3]).toBe(0);
    expect(pixel(cut, 20, 20)).toEqual(cloak);

    // Check the actual tile conversion too: the fringe must never become a
    // palette colour or get retained as a thin feature during reduction.
    const large = resizeNearest(image, 512, 512);
    for (const steps of [GENERATED_PICTURE_STEPS, REDRAWN_PICTURE_STEPS]) {
      const tile = runSteps(large, { w: 64, h: 64 }, steps);
      const opaque = Array.from({ length: 64 * 64 }, (_, i) =>
        pixel(tile, i % 64, Math.floor(i / 64)),
      ).filter((rgba) => rgba[3]);
      expect(opaque.length).toBeGreaterThan(0);
      expect(opaque.every((rgba) => rgba.join() === cloak.join())).toBe(true);
    }
  });
  it("clears background gaps that connect diagonally around a stepped outline", () => {
    const image = picture();
    for (let y = 2; y < 10; y++)
      for (let x = 2; x < 10; x++) put(image, x, y, [40, 15, 30, 255]);
    for (let n = 2; n < 6; n++) put(image, n, n, key);
    const result = cutOutBackground(image);
    for (let n = 2; n < 6; n++) expect(pixel(result, n, n)[3]).toBe(0);
    expect(pixel(result, 6, 5)).toEqual([40, 15, 30, 255]);
  });
  it("cleans a narrow magenta fringe along the staff without eroding purple material inside it", () => {
    const image = picture(64);
    const wood = [40, 15, 30, 255],
      purple = [210, 35, 210, 255];
    for (let y = 10; y < 55; y++)
      for (let x = 20; x < 25; x++) put(image, x, y, wood);
    for (let y = 14; y < 40; y++) put(image, 19, y, [203, 43, 185, 255]);
    for (let y = 30; y < 40; y++)
      for (let x = 21; x < 24; x++) put(image, x, y, purple);
    const result = cutOutBackground(resizeNearest(image, 512, 512));
    for (let y = 14; y < 40; y++)
      expect(pixel(result, 19 * 8, y * 8)[3]).toBe(0);
    expect(pixel(result, 20 * 8, 20 * 8)).toEqual(wood);
    expect(pixel(result, 22 * 8, 35 * 8)).toEqual(purple);
  });
  it("removes the outside key but preserves an eggplant's dark purple and bright purple highlights", () => {
    const image = picture();
    const dark = [80, 25, 115, 255],
      bright = [210, 35, 210, 255];
    for (let y = 3; y < 10; y++)
      for (let x = 3; x < 9; x++) put(image, x, y, x < 6 ? dark : bright);
    put(image, 5, 2, [65, 130, 40, 255]);
    const before = new Uint8ClampedArray(image.rgba);
    const result = cutOutBackground(image);
    expect(pixel(result, 0, 0)[3]).toBe(0);
    expect(pixel(result, 3, 4)).toEqual(dark);
    expect(pixel(result, 8, 4)).toEqual(bright);
    expect(pixel(result, 5, 2)).toEqual([65, 130, 40, 255]);
    expect(image.rgba).toEqual(before);
    const final = runSteps(image, { w: 12, h: 12 }, GENERATED_PICTURE_STEPS);
    expect(final.rgba.some((v, i) => i % 4 === 3 && v === 255)).toBe(true);
  });
  it("removes the reserved key from enclosed gaps, while keeping real purple details", () => {
    const image = picture();
    for (let y = 3; y < 9; y++)
      for (let x = 3; x < 9; x++) put(image, x, y, [100, 30, 150, 255]);
    put(image, 5, 5, key);
    put(image, 6, 5, [210, 35, 210, 255]);
    const result = cutOutBackground(image);
    expect(pixel(result, 0, 0)[3]).toBe(0);
    expect(pixel(result, 5, 5)[3]).toBe(0);
    expect(pixel(result, 6, 5)).toEqual([210, 35, 210, 255]);
  });
  it("keeps an already transparent purple sprite intact", () => {
    const image = picture();
    image.rgba.fill(0);
    put(image, 4, 4, [210, 35, 210, 255]);
    put(image, 4, 5, [225, 22, 207, 255]);
    put(image, 5, 5, key);
    expect(cutOutBackground(image).rgba).toEqual(image.rgba);
    expect(runSteps(image, image, REDRAWN_PICTURE_STEPS).rgba).toEqual(
      image.rgba,
    );
  });
  it("removes near-key pockets and their fringe before the 64×64 sprite palette is made", () => {
    const image: Bitmap = {
      w: 64,
      h: 64,
      rgba: new Uint8ClampedArray(
        Array.from({ length: 64 * 64 }, () => key).flat(),
      ),
    };
    const cloak = [35, 12, 30, 255],
      red = [150, 8, 40, 255];
    for (let y = 8; y < 60; y++)
      for (let x = 16; x < 48; x++) put(image, x, y, x < 28 ? cloak : red);
    // Both the gap under the raised arms and a small cloak opening are closed
    // off from the outside. Colours sampled from the second reported screenshot.
    for (const [x0, y0, w, h] of [
      [21, 15, 22, 12],
      [28, 48, 5, 7],
    ])
      for (let y = y0!; y < y0! + h!; y++)
        for (let x = x0!; x < x0! + w!; x++)
          put(image, x, y, [243, 5, 238, 255]);
    put(image, 23, 18, [191, 24, 179, 255]);
    put(image, 27, 18, [244, 5, 242, 255]);
    const source = resizeNearest(image, 512, 512);
    const preview = cutOutBackground(source);
    expect(pixel(preview, 27 * 8, 18 * 8)[3]).toBe(0);
    const tile = runSteps(source, { w: 64, h: 64 }, REDRAWN_PICTURE_STEPS);
    for (let y = 15; y < 27; y++)
      for (let x = 21; x < 43; x++) expect(pixel(tile, x, y)[3]).toBe(0);
    expect(pixel(tile, 23, 18)[3]).toBe(0);
    expect(pixel(tile, 30, 50)[3]).toBe(0);
    expect(pixel(tile, 18, 30)).toEqual(cloak);
    expect(pixel(tile, 40, 30)).toEqual(red);
    for (let i = 0; i < tile.w * tile.h; i++) {
      const colour = pixel(tile, i % tile.w, Math.floor(i / tile.w));
      if (colour[3])
        expect([cloak.join(), red.join()]).toContain(colour.join());
    }
  });
  it("preserves requested magenta scene backgrounds", () => {
    const image = picture();
    const result = runSteps(image, image, SCENE_PICTURE_STEPS);
    expect(pixel(result, 0, 0)).toEqual(key);
    expect(pixel(result, 11, 11)).toEqual(key);
  });
});
