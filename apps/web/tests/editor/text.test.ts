import { describe, expect, it } from "vitest";
import { textPiece } from "@/features/editor/pixel-canvas/text";
import {
  readLayerTexts,
  locateText,
  textCel,
  type LayerText,
  replaceInlineText,
  matchesInlineText,
} from "@/lib/layers/text";
import {
  blankDocument,
  parsePigxel,
  serializePigxel,
} from "@/lib/pigxel-file/format";

const RED = [255, 0, 0, 255] as const;

const rows = (piece: { w: number; h: number; pixels: Uint8ClampedArray }) =>
  Array.from({ length: piece.h }, (_, y) =>
    Array.from({ length: piece.w }, (_, x) =>
      piece.pixels[(y * piece.w + x) * 4 + 3] ? "#" : ".",
    ).join(""),
  );

describe("text tool", () => {
  it("stacks lines left aligned with a blank pixel between them", async () => {
    const piece = await textPiece("HI\nI", "tiny", 1, RED, 2, 3);
    expect(piece).toMatchObject({ x: 2, y: 3, w: 7, h: 11 });
    const drawn = rows(piece!);
    expect(drawn[5]).toBe(".......");
    expect(drawn[6]).toBe("###....");
  });
  it("preserves blank lines, normalizes pasted line endings and scales spacing", async () => {
    const piece = await textPiece("A\r\n\r\nB", "tiny", 2, RED, 0, 0);
    expect(piece).toMatchObject({ w: 6, h: 34 });
    expect(
      rows(piece!)
        .slice(10, 24)
        .every((row) => row === "......"),
    ).toBe(true);
  });
  it("writes the 3 × 5 font a pixel apart, lowercase as capitals", async () => {
    const piece = await textPiece("hi!", "tiny", 1, RED, 2, 3);
    expect(piece).toMatchObject({ x: 2, y: 3, w: 9, h: 5 });
    expect(rows(piece!)).toEqual([
      "#.#.###.#",
      "#.#..#..#",
      "###..#..#",
      "#.#..#...",
      "#.#.###.#",
    ]);
    expect([...piece!.pixels.slice(0, 4)]).toEqual([...RED]);
  });
  it("scales each pixel up into a square", async () => {
    const piece = await textPiece("i", "tiny", 2, RED, 0, 0);
    expect(rows(piece!)).toEqual([
      "######",
      "######",
      "..##..",
      "..##..",
      "..##..",
      "..##..",
      "..##..",
      "..##..",
      "######",
      "######",
    ]);
  });
  it("adds letter and line spacing in font pixels", async () => {
    const wide = await textPiece("II\nI", "tiny", 1, RED, 0, 0, {
      letter: 2,
      line: 3,
    });
    expect(wide).toMatchObject({ w: 9, h: 14 });
    expect(rows(wide!)[0]).toBe("###...###");
    const tight = await textPiece("II", "tiny", 2, RED, 0, 0, { letter: -1 });
    expect(tight).toMatchObject({ w: 12, h: 10 });
  });
  it("keeps spacing within limits", async () => {
    const piece = await textPiece("I\nI", "tiny", 1, RED, 0, 0, { line: -99 });
    expect(piece).toMatchObject({ h: 9 });
  });
  it("draws nothing for spaces or unknown characters", async () => {
    expect(await textPiece("  ", "tiny", 1, RED, 0, 0)).toBeNull();
  });
  it("keeps texts written with an uploaded font", () => {
    const text = { value: "A", scale: 1, rgba: [0, 0, 0, 255], x: 0, y: 0 };
    const font = "custom:0b8a4c1e-2f3d-4a5b-8c6d-7e8f9a0b1c2d";
    expect(readLayerTexts({ f: { ...text, font } })?.f?.font).toBe(font);
    expect(
      readLayerTexts({ f: { ...text, font: "custom:x" } }),
    ).toBeUndefined();
  });
});

const text: LayerText = {
  value: "One\nTwo",
  font: "tiny",
  scale: 1,
  rgba: [255, 0, 0, 255],
  x: 2,
  y: 3,
};
const piece = {
  x: 2,
  y: 3,
  w: 2,
  h: 2,
  pixels: new Uint8ClampedArray([
    255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 255,
  ]),
  mask: new Uint8Array(4).fill(1),
};
describe("editable text layers", () => {
  it("edits text on the existing cel and restores the picture beneath removed letters", () => {
    const size = { w: 12, h: 12 };
    const background = new Uint8ClampedArray(size.w * size.h * 4).fill(50);
    const first = replaceInlineText(background, size, piece, text)!;
    expect(matchesInlineText(first.record, first.pixels, size)).toBe(true);
    const shorter = {
      ...piece,
      w: 1,
      h: 1,
      pixels: piece.pixels.slice(0, 4),
      mask: new Uint8Array([1]),
    };
    const edited = replaceInlineText(
      first.pixels,
      size,
      shorter,
      { ...text, value: "A" },
      first.record,
    )!;
    expect(edited.pixels[(4 * 12 + 3) * 4]).toBe(50);
    expect(edited.pixels[0]).toBe(50);
    expect(edited.record.id).toBe(first.record.id);
    const changed = new Uint8ClampedArray(first.pixels);
    changed[(3 * 12 + 2) * 4] = 20;
    const changedResult = replaceInlineText(
      changed,
      size,
      { ...shorter, x: 8, y: 8 },
      { ...text, x: 8, y: 8 },
      first.record,
    );
    expect(changedResult.pixels[(3 * 12 + 2) * 4]).toBe(20);
    expect(changedResult.pixels[(4 * 12 + 3) * 4]).toBe(50);
  });
  it("retains several editable text objects without adding layers", () => {
    const doc = blankDocument(12, 12, "transparent");
    const frame = doc.frames[0]!.id,
      layer = doc.layers[0]!;
    const first = replaceInlineText(
      new Uint8ClampedArray(12 * 12 * 4),
      { w: 12, h: 12 },
      piece,
      text,
    )!;
    const secondPiece = { ...piece, x: 7, y: 7 };
    const second = replaceInlineText(
      first.pixels,
      { w: 12, h: 12 },
      secondPiece,
      { ...text, x: 7, y: 7 },
    )!;
    layer.textObjects = { [frame]: [first.record, second.record] };
    doc.cels.get(frame)!.set(layer.id, second.pixels);
    const back = parsePigxel(serializePigxel(doc));
    expect(back.layers).toHaveLength(1);
    expect(back.layers[0]!.textObjects?.[frame]).toHaveLength(2);
  });
  it("keeps text content and style when saving and reopening a pigxel file", () => {
    const doc = blankDocument(12, 12, "transparent");
    doc.layers[0]!.texts = { [doc.frames[0]!.id]: text };
    const restored = parsePigxel(serializePigxel(doc));
    expect(restored.layers[0]!.texts?.[restored.frames[0]!.id]).toEqual(text);
  });
  it("recognizes moved text while rejecting extra painting on the layer", () => {
    const size = { w: 12, h: 12 };
    const moved = textCel({ ...piece, x: 5, y: 7 }, size);
    expect(locateText(piece, moved, size)).toEqual({ x: 5, y: 7 });
    moved.set([0, 255, 0, 255], 0);
    expect(locateText(piece, moved, size)).toBeNull();
  });
  it("clips raster output to canvas bounds", () => {
    const pixels = textCel({ ...piece, x: -1, y: -1 }, { w: 2, h: 2 });
    expect([...pixels.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect(pixels).toHaveLength(16);
  });
  it("validates text metadata", () => {
    expect(readLayerTexts({ frame: text })).toEqual({ frame: text });
    expect(
      readLayerTexts({ frame: { ...text, font: "unknown" } }),
    ).toBeUndefined();
    expect(
      readLayerTexts({ frame: { ...text, rgba: [300, 0, 0, 255] } }),
    ).toBeUndefined();
  });
});
