import { describe, expect, it } from "vitest";
import { encodeGif } from "@/lib/export/gif";
import { decodeGif } from "@/lib/image/gif-decode";
import {
  documentFromFrames,
  imageBaseName,
  pixelScale,
} from "@/lib/pigxel-file/import-image";
import { celOf } from "@/lib/sprite/frames";

const RED = [255, 0, 0, 255];
const BLUE = [0, 0, 255, 255];
const CLEAR = [0, 0, 0, 0];

/** A w × h picture from rows of "r", "b" and "." (transparent). */
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
    // 200 colours (a GIF holds 255) in a long, varied pattern.
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
