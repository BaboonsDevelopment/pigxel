import { describe, expect, it } from "vitest";
import { stretchedSource } from "@/lib/export/export";
import {
  blankDocument,
  parsePigxel,
  serializePigxel,
} from "@/lib/pigxel-file/format";
import { readPixelRatio } from "@/lib/sprite/pixel-ratio";

describe("pixel ratio", () => {
  it("keeps wide or tall pixels in the .pigxel file, nothing for square", () => {
    const wide = {
      ...blankDocument(2, 2, "transparent"),
      pixelRatio: { w: 2, h: 1 } as const,
    };
    expect(parsePigxel(serializePigxel(wide)).pixelRatio).toEqual({
      w: 2,
      h: 1,
    });
    expect(serializePigxel(blankDocument(2, 2, "transparent"))).not.toContain(
      "pixelRatio",
    );
    expect(readPixelRatio({ w: 3, h: 1 })).toEqual({ w: 1, h: 1 });
  });
  it("exports 2:1 pixels as two square ones side by side", () => {
    const red = [255, 0, 0, 255];
    const blue = [0, 0, 255, 255];
    const source = stretchedSource(
      {
        name: "t",
        size: { w: 2, h: 1 },
        frames: [],
        frameId: "f",
        background: "transparent",
        picture: () => new Uint8ClampedArray([...red, ...blue]),
        slices: [
          {
            id: "s",
            name: "s",
            bounds: { x: 1, y: 0, w: 1, h: 1 },
            center: null,
            pivot: null,
          },
        ],
      },
      { w: 2, h: 1 },
    );
    expect(source.size).toEqual({ w: 4, h: 1 });
    expect([...source.picture("f")]).toEqual([
      ...red,
      ...red,
      ...blue,
      ...blue,
    ]);
    expect(source.slices[0]!.bounds).toEqual({ x: 2, y: 0, w: 2, h: 1 });
  });
});
