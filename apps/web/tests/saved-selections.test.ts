import { describe, expect, it } from "vitest";
import {
  decodeMask,
  encodeMask,
  nextSelectionName,
  readSavedSelections,
} from "@/lib/selections/saved";
import {
  blankDocument,
  parsePigxel,
  serializePigxel,
} from "@/lib/pigxel-file/format";
import {
  colorMask,
  contentMask,
} from "@/features/editor/pixel-canvas/selection";

describe("saved selections", () => {
  it("packs a mask into runs and back", () => {
    const mask = Uint8Array.from([1, 1, 0, 0, 0, 1, 0, 1]);
    expect(encodeMask(mask)).toBe("0,2,3,1,1,1");
    expect(decodeMask(encodeMask(mask), 8)).toEqual(mask);
    expect(decodeMask("0,2,3", 8)).toBeNull();
    expect(decodeMask("9", 8)).toBeNull();
  });
  it("keeps named selections with the tile", () => {
    const doc = blankDocument(2, 2, "transparent");
    doc.selections = [
      { id: "a", name: "Eyes", mask: Uint8Array.from([1, 0, 0, 1]) },
    ];
    const back = parsePigxel(serializePigxel(doc));
    expect(back.selections).toEqual(doc.selections);
  });
  it("drops broken entries", () => {
    expect(
      readSavedSelections(
        [
          { id: "a", name: "Ok", mask: "1,3" },
          { id: "a", name: "Same id", mask: "1,3" },
          { id: "b", name: " ", mask: "1,3" },
          { id: "c", name: "Wrong size", mask: "1,9" },
        ],
        2,
        2,
      ).map((s) => s.name),
    ).toEqual(["Ok"]);
  });
  it("names new selections in order", () => {
    expect(
      nextSelectionName([
        { id: "a", name: "Selection 2", mask: new Uint8Array() },
      ]),
    ).toBe("Selection 3");
  });
  it("selects pixels of one colour or with any content", () => {
    const pixels = Uint8ClampedArray.from([
      255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 128, 0, 255, 0, 255,
    ]);
    expect([...colorMask(pixels, [255, 0, 0, 255])]).toEqual([1, 0, 0, 0]);
    expect([...contentMask(pixels)]).toEqual([1, 0, 1, 1]);
  });
});
