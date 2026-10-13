import { describe, expect, it } from "vitest";
import { textPiece } from "@/features/editor/pixel-canvas/text";
import { readLayerTexts } from "@/lib/layers/text";

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
