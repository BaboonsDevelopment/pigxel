import { describe, expect, it, vi } from "vitest";
import { textPiece } from "@/components/pixel-canvas/text";

// The web fonts load through Next.js; the 3 × 5 font needs none of them.
vi.mock("@/lib/pixel-fonts", () => ({
  tiny5: { style: { fontFamily: "Tiny5" } },
  dotGothic16: { style: { fontFamily: "DotGothic16" } },
  silkscreen: { style: { fontFamily: "Silkscreen" } },
  pressStart2P: { style: { fontFamily: "Press Start 2P" } },
}));

const RED = [255, 0, 0, 255] as const;

/** The piece as rows of "#" (drawn) and "." for easy reading. */
const rows = (piece: { w: number; h: number; pixels: Uint8ClampedArray }) =>
  Array.from({ length: piece.h }, (_, y) =>
    Array.from({ length: piece.w }, (_, x) =>
      piece.pixels[(y * piece.w + x) * 4 + 3] ? "#" : ".",
    ).join(""),
  );

describe("text tool", () => {
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
  it("draws nothing for spaces or unknown characters", async () => {
    expect(await textPiece("  ", "tiny", 1, RED, 0, 0)).toBeNull();
  });
});
