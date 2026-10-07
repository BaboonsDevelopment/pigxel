import { describe, expect, it } from "vitest";
import { outlinedWith } from "@/features/editor/pixel-canvas/effects";

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
