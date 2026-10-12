import { describe, expect, it } from "vitest";
import {
  blankDocument,
  parsePigxel,
  serializePigxel,
} from "@/lib/pigxel-file/format";
import { createFrame } from "@/lib/sprite/frames";
import {
  frameImages,
  isAllowed,
  modelInput,
  worstFrame,
  type Scores,
} from "@/features/moderation/frames";
import { INPUT_SIZE } from "@/features/moderation/constants";
import { checkedThumbnail } from "@/features/moderation/thumbnail";

const pixel = (out: Uint8Array, x: number, y: number) =>
  Array.from(out.slice((y * INPUT_SIZE + x) * 3, (y * INPUT_SIZE + x) * 3 + 3));

const scores = (s: Partial<Scores>): Scores => ({
  Drawing: 0,
  Hentai: 0,
  Neutral: 0,
  Porn: 0,
  Sexy: 0,
  ...s,
});

describe("modelInput", () => {
  it("upscales with sharp pixels to the model size", () => {
    const rgba = [255, 0, 0, 255, 0, 0, 255, 255];
    const out = modelInput(rgba, 2, 1, 255);
    expect(out.length).toBe(INPUT_SIZE * INPUT_SIZE * 3);
    expect(pixel(out, 0, 0)).toEqual([255, 0, 0]);
    expect(pixel(out, INPUT_SIZE / 2 - 1, 100)).toEqual([255, 0, 0]);
    expect(pixel(out, INPUT_SIZE / 2, 100)).toEqual([0, 0, 255]);
  });

  it("puts transparent pixels on the backdrop", () => {
    expect(pixel(modelInput([10, 20, 30, 0], 1, 1, 255), 5, 5)).toEqual([
      255, 255, 255,
    ]);
    expect(pixel(modelInput([200, 200, 200, 0], 1, 1, 0), 5, 5)).toEqual([
      0, 0, 0,
    ]);
  });
});

describe("isAllowed", () => {
  it("passes drawings", () => {
    expect(isAllowed([scores({ Drawing: 0.9, Neutral: 0.1 })])).toBe(true);
  });

  it("rejects explicit or suggestive frames, even one of many", () => {
    expect(
      isAllowed([scores({ Drawing: 1 }), scores({ Hentai: 0.2, Porn: 0.2 })]),
    ).toBe(false);
    expect(isAllowed([scores({ Sexy: 0.5 })])).toBe(false);
  });
});

describe("worstFrame", () => {
  it("picks the most explicit frame", () => {
    const bad = scores({ Porn: 0.6 });
    expect(worstFrame([scores({ Drawing: 1 }), bad])).toBe(bad);
    expect(worstFrame([])).toBeNull();
  });
});

describe("frameImages", () => {
  it("reads a saved file and checks each different frame once", () => {
    const doc = blankDocument(8, 8, "white");
    doc.frames.push(createFrame());
    const images = frameImages(parsePigxel(serializePigxel(doc)));
    expect(images).toHaveLength(1);
    expect(pixel(images[0]!, 0, 0)).toEqual([255, 255, 255]);
  });

  it("uses a black backdrop for black tiles", () => {
    const images = frameImages(blankDocument(4, 4, "black"));
    expect(pixel(images[0]!, 3, 3)).toEqual([0, 0, 0]);
  });
});

describe("checkedThumbnail", () => {
  it("makes a small PNG from the checked file", () => {
    const url = checkedThumbnail(blankDocument(256, 128, "white"));
    expect(url).toMatch(/^data:image\/png;base64,/);
    const png = Buffer.from(url!.split(",")[1]!, "base64");
    expect(png.readUInt32BE(16)).toBe(64);
    expect(png.readUInt32BE(20)).toBe(32);
  });
});
