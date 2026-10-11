import { describe, expect, it } from "vitest";
import { encodeGif } from "@/features/editor/export/gif";
import { decodeGif } from "@/lib/image/gif-decode";
import {
  documentFromFrames,
  imageBaseName,
  pixelScale,
  sequenceName,
  sequenceOrder,
  croppedAnimation,
  fitted,
  looksLikePixelArt,
  tooLarge,
} from "@/lib/pigxel-file/import-image";
import { celOf } from "@/lib/sprite/frames";
import {
  cutSheet,
  guessSheetGrid,
  nativeSheet,
  sheetCells,
  sheetGridProblem,
} from "@/lib/pigxel-file/import-sheet";

const RED = [255, 0, 0, 255];
const BLUE = [0, 0, 255, 255];
const CLEAR = [0, 0, 0, 0];

const picture = (rows: string[]) =>
  new Uint8ClampedArray(
    rows.flatMap((row) =>
      [...row].flatMap((c) => (c === "r" ? RED : c === "b" ? BLUE : CLEAR)),
    ),
  );

describe("reading a GIF", () => {
  it("reads every frame with its timing and transparency", () => {
    const frames = [
      { rgba: picture(["rb", ".r"]), duration: 120 },
      { rgba: picture(["bb", "r."]), duration: 300 },
    ];
    const gif = decodeGif(encodeGif(frames, 2, 2));
    expect([gif.w, gif.h]).toEqual([2, 2]);
    expect(gif.frames.map((f) => f.duration)).toEqual([120, 300]);
    expect([...gif.frames[0]!.rgba]).toEqual([...frames[0]!.rgba]);
    expect([...gif.frames[1]!.rgba]).toEqual([...frames[1]!.rgba]);
  });
  it("reads a larger picture whose codes grow past 9 bits", () => {
    const w = 40;
    const rgba = new Uint8ClampedArray(w * w * 4);
    for (let i = 0; i < w * w; i++) {
      const c = (i * 7 + Math.floor(i / 13)) % 200;
      rgba.set([c, 255 - c, (c * 3) % 256, 255], i * 4);
    }
    const gif = decodeGif(encodeGif([{ rgba, duration: 100 }], w, w));
    expect([...gif.frames[0]!.rgba]).toEqual([...rgba]);
  });
  it("refuses files that aren't GIFs", () => {
    expect(() => decodeGif(new Uint8Array([1, 2, 3, 4, 5, 6, 7]))).toThrow();
  });
});

describe("a picture as a tile", () => {
  it("finds how much pixel art was enlarged", () => {
    const one = {
      w: 4,
      h: 4,
      frames: [
        { rgba: picture(["rrbb", "rrbb", "bbrr", "bbrr"]), duration: 100 },
      ],
    };
    expect(pixelScale(one)).toBe(2);
    const plain = {
      w: 2,
      h: 2,
      frames: [{ rgba: picture(["rb", "br"]), duration: 100 }],
    };
    expect(pixelScale(plain)).toBe(1);
  });
  it("makes one layer with a frame per picture and the picture's colours", () => {
    const doc = documentFromFrames({
      w: 2,
      h: 1,
      frames: [
        { rgba: picture(["rb"]), duration: 80 },
        { rgba: picture(["r."]), duration: 200 },
      ],
    });
    expect(doc.layers).toHaveLength(1);
    expect(doc.background).toBe("transparent");
    expect(doc.frames.map((f) => f.duration)).toEqual([80, 200]);
    const second = celOf(doc.cels, doc.frames[1]!.id, doc.layers[0]!.id);
    expect([...second!]).toEqual([...picture(["r."])]);
    expect(doc.palette.sort()).toEqual(["#0000ff", "#ff0000"]);
  });
  it("names the tile after the file", () => {
    expect(imageBaseName("hero walk.GIF")).toBe("hero walk");
    expect(imageBaseName("tree.png")).toBe("tree");
  });
});

describe("pictures as frames", () => {
  it("puts numbered files in counting order", () => {
    const files = ["walk_10.png", "walk_2.png", "Walk_1.png"].map((name) => ({
      name,
    }));
    expect(sequenceOrder(files).map((f) => f.name)).toEqual([
      "Walk_1.png",
      "walk_2.png",
      "walk_10.png",
    ]);
  });
  it("names the tile after what the files share, without the number", () => {
    expect(sequenceName(["walk_01.png", "walk_02.png", "walk_08.png"])).toBe(
      "walk",
    );
    expect(sequenceName(["hero run 1.gif", "hero run 2.gif"])).toBe("hero run");
    expect(sequenceName(["frame1.png", "frame2.png"])).toBe("frame");
    expect(sequenceName(["cat.png", "dog.png"])).toBe("cat");
  });
});

const sheet = (
  w: number,
  h: number,
  empty: (x: number, y: number) => boolean = () => false,
) => {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!empty(x, y)) rgba.set([x, y, 0, 255], (y * w + x) * 4);
  return { rgba, w, h };
};

describe("importing a sprite sheet", () => {
  it("guesses frames in a row or a column by how alike neighbours look", () => {
    const w = 64 * 20;
    const row = sheet(w, 48, (x, y) => {
      const f = Math.floor(x / 64);
      const left = 20 + (f % 3);
      return !(x % 64 >= left && x % 64 < left + 20 && y >= 10 && y < 30);
    });
    expect(guessSheetGrid(row)).toMatchObject({ frameW: 64, frameH: 48 });
    const column = sheet(16, 48, (x, y) => (y % 16) + x < 10);
    expect(guessSheetGrid(column)).toMatchObject({ frameW: 16, frameH: 16 });
    expect(guessSheetGrid(sheet(30, 20))).toMatchObject({
      frameW: 30,
      frameH: 20,
    });
  });
  it("guesses frames in a grid", () => {
    const grid = sheet(64 * 5, 48 * 4, (x, y) => {
      const f = Math.floor(x / 64) + Math.floor(y / 48) * 5;
      const left = 20 + (f % 3);
      return !(
        x % 64 >= left &&
        x % 64 < left + 20 &&
        y % 48 >= 10 &&
        y % 48 < 30
      );
    });
    expect(guessSheetGrid(grid)).toMatchObject({ frameW: 64, frameH: 48 });
    expect(cutSheet(grid, guessSheetGrid(grid)).frames).toHaveLength(20);
  });
  it("reads a sheet exported enlarged at its own size", () => {
    const small = sheet(8, 2);
    const big = { w: 32, h: 8, rgba: new Uint8ClampedArray(32 * 8 * 4) };
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 32; x++)
        big.rgba.set(
          small.rgba.subarray(
            (Math.floor(y / 4) * 8 + Math.floor(x / 4)) * 4,
            (Math.floor(y / 4) * 8 + Math.floor(x / 4)) * 4 + 4,
          ),
          (y * 32 + x) * 4,
        );
    const native = nativeSheet(big);
    expect(native.scale).toBe(4);
    expect([...native.picture.rgba]).toEqual([...small.rgba]);
  });
  it("finds every whole frame, with an offset and gaps", () => {
    const grid = {
      ...guessSheetGrid(sheet(1, 1)),
      frameW: 4,
      frameH: 4,
      offsetX: 1,
      offsetY: 1,
      gapX: 1,
      gapY: 2,
    };
    expect(sheetCells(grid, 11, 11).map((c) => [c.x, c.y])).toEqual([
      [1, 1],
      [6, 1],
      [1, 7],
      [6, 7],
    ]);
  });
  it("cuts frames row by row and leaves out empty ones", () => {
    const pic = sheet(8, 4, (x, y) => y >= 2 && x >= 4);
    const grid = {
      ...guessSheetGrid(sheet(8, 4)),
      frameW: 4,
      frameH: 2,
      duration: 60,
    };
    const cut = cutSheet(pic, grid);
    expect(cut.frames).toHaveLength(3);
    expect([cut.w, cut.h]).toEqual([4, 2]);
    expect(cut.frames[1]!.rgba[0]).toBe(4);
    expect(cut.frames[2]!.rgba[1]).toBe(2);
    expect(cut.frames.every((f) => f.duration === 60)).toBe(true);
    expect(cutSheet(pic, { ...grid, skipEmpty: false }).frames).toHaveLength(4);
  });
  it("explains what is wrong with a grid", () => {
    const grid = guessSheetGrid(sheet(8, 8));
    expect(sheetGridProblem(grid, 8, 8)).toBeNull();
    expect(sheetGridProblem({ ...grid, frameW: 300 }, 600, 8)).toMatch(
      "at most 256",
    );
    expect(sheetGridProblem({ ...grid, offsetX: 4 }, 8, 8)).toMatch(
      "No whole frame",
    );
  });
});

const BIG_RED = [255, 0, 0, 255];
const BIG_BLUE = [0, 0, 255, 255];

function checker(w: number, h: number, block: number) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      rgba.set(
        (Math.floor(x / block) + Math.floor(y / block)) % 2
          ? BIG_BLUE
          : BIG_RED,
        (y * w + x) * 4,
      );
  return { w, h, frames: [{ rgba, duration: 100 }] };
}

describe("big pictures", () => {
  it("knows pixel art by its few colors", () => {
    expect(looksLikePixelArt(checker(4, 4, 1).frames[0]!.rgba)).toBe(true);
    const noisy = new Uint8ClampedArray(600 * 4);
    for (let i = 0; i < 600; i++) noisy.set([i % 256, i >> 8, 7, 255], i * 4);
    expect(looksLikePixelArt(noisy)).toBe(false);
  });

  it("scales pixel art down without blending colors", () => {
    const out = fitted(checker(512, 512, 4));
    expect([out.w, out.h]).toEqual([256, 256]);
    const colors = new Set<string>();
    const rgba = out.frames[0]!.rgba;
    for (let i = 0; i < rgba.length; i += 4)
      colors.add(rgba.slice(i, i + 4).join());
    expect([...colors].sort()).toEqual(
      [BIG_BLUE.join(), BIG_RED.join()].sort(),
    );
  });

  it("crops a piece at full size", () => {
    const big = checker(300, 280, 10);
    expect(tooLarge(big)).toBe(true);
    const piece = croppedAnimation(big, { x: 10, y: 0, w: 256, h: 256 });
    expect([piece.w, piece.h]).toEqual([256, 256]);
    expect([...piece.frames[0]!.rgba.slice(0, 4)]).toEqual(BIG_BLUE);
    expect(tooLarge(piece)).toBe(false);
  });
});
