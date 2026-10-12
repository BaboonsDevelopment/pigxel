import { describe, expect, it } from "vitest";
import {
  locateText,
  readLayerTexts,
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
