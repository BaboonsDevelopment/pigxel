import { describe, expect, it } from "vitest";
import {
  borderMask,
  contractMask,
  expandMask,
} from "@/components/pixel-canvas/selection";

const size = { w: 5, h: 5 };

function mask(rows: string[]) {
  return Uint8Array.from(rows.join(""), (c) => (c === "#" ? 1 : 0));
}

function rows(m: Uint8Array) {
  return Array.from({ length: size.h }, (_, y) =>
    Array.from(m.slice(y * size.w, (y + 1) * size.w), (v) =>
      v ? "#" : ".",
    ).join(""),
  );
}

const dot = mask([".....", ".....", "..#..", ".....", "....."]);
const block = mask([".....", ".###.", ".###.", ".###.", "....."]);

describe("modify selection", () => {
  it("expands round by the four neighbours, square by all eight", () => {
    expect(rows(expandMask(dot, size, 1))).toEqual([
      ".....",
      "..#..",
      ".###.",
      "..#..",
      ".....",
    ]);
    expect(rows(expandMask(dot, size, 1, "square"))).toEqual(rows(block));
  });
  it("contracts, counting the tile's edge as outside", () => {
    expect(rows(contractMask(block, size, 1))).toEqual(rows(dot));
    const all = new Uint8Array(25).fill(1);
    expect(rows(contractMask(all, size, 1, "square"))).toEqual(rows(block));
  });
  it("keeps a band inside the edge for Border", () => {
    expect(rows(borderMask(block, size, 1))).toEqual([
      ".....",
      ".###.",
      ".#.#.",
      ".###.",
      ".....",
    ]);
  });
});
