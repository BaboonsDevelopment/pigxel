import { describe, expect, it } from "vitest";
import {
  CONVOLUTIONS,
  STRAIGHT_CHANNELS,
  STRAIGHT_CURVE,
  adjustedBrightnessContrast,
  adjustedColors,
  adjustedHueSaturation,
  convolved,
  curveTable,
  despeckled,
  invertedColors,
  outlinedWith,
  replacedColor,
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

describe("invert, despeckle, curve", () => {
  it("inverts colours but not alpha", () => {
    const out = invertedColors(pixels(), null);
    expect([...out.slice(0, 8)]).toEqual([
      0, 255, 255, 255, 127, 127, 127, 255,
    ]);
  });
  it("removes a lone stray pixel", () => {
    const grey = [50, 50, 50, 255];
    const tile = new Uint8ClampedArray(
      Array.from({ length: 9 }, (_, i) =>
        i === 4 ? [255, 0, 0, 255] : grey,
      ).flat(),
    );
    const out = despeckled(tile, null, { w: 3, h: 3 }, 1);
    expect([...out.slice(16, 20)]).toEqual(grey);
  });
  it("bends one channel, then the shared curve", () => {
    const pixel = new Uint8ClampedArray([100, 100, 100, 255]);
    const out = adjustedColors(
      "curve",
      pixel,
      null,
      { w: 1, h: 1 },
      {
        values: {},
        matrix: [],
        curve: [
          [0, 10],
          [255, 255],
        ],
        channels: {
          ...STRAIGHT_CHANNELS,
          blue: [
            [0, 255],
            [255, 255],
          ],
        },
      },
    );
    const shared = curveTable([
      [0, 10],
      [255, 255],
    ]);
    expect([...out]).toEqual([shared[100], shared[100], 255, 255]);
  });
  it("keeps a straight curve and follows its points", () => {
    expect([...curveTable(STRAIGHT_CURVE)]).toEqual(
      Array.from({ length: 256 }, (_, i) => i),
    );
    const table = curveTable([
      [0, 0],
      [128, 200],
      [255, 255],
    ]);
    expect(table[128]).toBe(200);
    for (let i = 1; i < 256; i++)
      expect(table[i]).toBeGreaterThanOrEqual(table[i - 1]!);
  });
});

describe("convolution matrix", () => {
  const tile = () =>
    new Uint8ClampedArray(
      Array.from({ length: 9 }, (_, i) =>
        i === 4 ? [200, 200, 200, 255] : [20, 20, 20, 255],
      ).flat(),
    );
  it("keeps the picture with a lone centre weight", () => {
    expect([
      ...convolved(
        tile(),
        null,
        { w: 3, h: 3 },
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        0,
      ),
    ]).toEqual([...tile()]);
  });
  it("blurs the bright pixel into its neighbours", () => {
    const out = convolved(
      tile(),
      null,
      { w: 3, h: 3 },
      CONVOLUTIONS[1]!.matrix,
      0,
    );
    expect(out[16]).toBe(40);
    expect(out[19]).toBe(255);
  });
  it("adds the bias and leaves clear pixels alone", () => {
    const px = tile();
    px[3] = 0;
    const out = convolved(
      px,
      null,
      { w: 3, h: 3 },
      [-1, -1, -1, -1, 8, -1, -1, -1, -1],
      128,
    );
    expect(out[3]).toBe(0);
    expect(out[16]).toBe(255);
  });
});

const size = { w: 5, h: 5 };
const RED = [255, 0, 0, 255] as const;
const BLACK = [0, 0, 0, 255] as const;

const block = () => {
  const px = new Uint8ClampedArray(25 * 4);
  for (let y = 1; y < 4; y++)
    for (let x = 1; x < 4; x++) px.set(RED, (y * 5 + x) * 4);
  return px;
};

const map = (px: Uint8ClampedArray) =>
  Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 5 }, (_, x) => {
      const i = (y * 5 + x) * 4;
      return !px[i + 3] ? "." : px[i] ? "r" : "#";
    }).join(""),
  );

describe("outline settings", () => {
  it("draws a round outline outside", () => {
    expect(
      map(
        outlinedWith(block(), size, BLACK, null, {
          place: "outside",
          shape: "round",
          width: 1,
        }),
      ),
    ).toEqual([".###.", "#rrr#", "#rrr#", "#rrr#", ".###."]);
  });
  it("fills the corners when square", () => {
    expect(
      map(
        outlinedWith(block(), size, BLACK, null, {
          place: "outside",
          shape: "square",
          width: 1,
        }),
      )[0],
    ).toBe("#####");
  });
  it("draws inside the shape", () => {
    expect(
      map(
        outlinedWith(block(), size, BLACK, null, {
          place: "inside",
          shape: "round",
          width: 1,
        }),
      ),
    ).toEqual([".....", ".###.", ".#r#.", ".###.", "....."]);
  });
  it("draws thicker inside lines", () => {
    expect(
      map(
        outlinedWith(block(), size, BLACK, null, {
          place: "inside",
          shape: "round",
          width: 2,
        }),
      )[2],
    ).toBe(".###.");
  });
});

const replacePixels = () =>
  new Uint8ClampedArray([
    ...[0, 200, 0, 255],
    ...[0, 160, 20, 255],
    ...[200, 0, 0, 255],
    ...[0, 0, 0, 0],
  ]);

describe("replace colour", () => {
  it("replaces only the exact colour with no tolerance", () => {
    const out = replacedColor(
      replacePixels(),
      [0, 200, 0, 255],
      [0, 0, 255, 255],
      null,
    );
    expect([...out.slice(0, 8)]).toEqual([0, 0, 255, 255, 0, 160, 20, 255]);
  });
  it("takes shades within the tolerance, never clear pixels", () => {
    const out = replacedColor(
      replacePixels(),
      [0, 200, 0, 255],
      [0, 0, 255, 255],
      null,
      255,
    );
    expect([...out.slice(4, 8)]).toEqual([0, 0, 255, 255]);
    expect([...out.slice(12, 16)]).toEqual([0, 0, 0, 0]);
  });
  it("keeps shading by shifting each colour by the same amount", () => {
    const out = replacedColor(
      replacePixels(),
      [0, 200, 0, 255],
      [0, 0, 200, 255],
      null,
      60,
      true,
    );
    expect([...out.slice(0, 8)]).toEqual([0, 0, 200, 255, 0, 0, 220, 255]);
    expect([...out.slice(8, 12)]).toEqual([200, 0, 0, 255]);
  });
  it("stays inside the selection", () => {
    const out = replacedColor(
      replacePixels(),
      [0, 200, 0, 255],
      [0, 0, 255, 255],
      new Uint8Array([0, 1, 1, 1]),
      60,
    );
    expect([...out.slice(0, 4)]).toEqual([0, 200, 0, 255]);
    expect([...out.slice(4, 8)]).toEqual([0, 0, 255, 255]);
  });
});
