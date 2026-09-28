import { describe, expect, it } from "vitest";
import {
  PigxelFileError,
  blankImage,
  parsePigxel,
  pigxelFileName,
  serializePigxel,
  type PigxelImage,
} from "@/lib/pigxel-file/format";

function image(width: number, height: number): PigxelImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * 37) % 256;
  return { width, height, data };
}

const file = (value: unknown) => JSON.stringify(value);
const valid = JSON.parse(serializePigxel(image(2, 2)));

describe(".pigxel format", () => {
  it("round-trips every pixel, including transparency", () => {
    for (const original of [image(1, 1), image(32, 32), image(256, 200)]) {
      const parsed = parsePigxel(serializePigxel(original));
      expect(parsed.width).toBe(original.width);
      expect(parsed.height).toBe(original.height);
      expect(parsed.data).toEqual(original.data);
    }
  });
  it("writes a versioned, single-layer document", () => {
    expect(valid).toMatchObject({
      format: "pigxel",
      version: 1,
      width: 2,
      height: 2,
      layers: [{ name: "Layer 1", visible: true, opacity: 1 }],
    });
    expect(typeof valid.layers[0].pixels).toBe("string");
  });
  it("rejects files that aren't Pigxel files", () => {
    for (const text of ["", "not json", "[]", file({ format: "png" })]) {
      expect(() => parsePigxel(text)).toThrow("isn’t a Pigxel file");
    }
  });
  it("rejects files from a newer version", () => {
    expect(() => parsePigxel(file({ ...valid, version: 2 }))).toThrow(
      "newer version",
    );
  });
  it("rejects invalid sizes and damaged pixels", () => {
    for (const size of [0, 257, 1.5, "32"]) {
      expect(() => parsePigxel(file({ ...valid, width: size }))).toThrow(
        PigxelFileError,
      );
    }
    expect(() => parsePigxel(file({ ...valid, layers: [] }))).toThrow(
      "no pixels",
    );
    const short = { ...valid.layers[0], pixels: btoa("abc") };
    expect(() => parsePigxel(file({ ...valid, layers: [short] }))).toThrow(
      "damaged",
    );
    const garbage = { ...valid.layers[0], pixels: "@@@" };
    expect(() => parsePigxel(file({ ...valid, layers: [garbage] }))).toThrow(
      "damaged",
    );
  });
});

describe("backgrounds", () => {
  it("fills a new tile with its background", () => {
    expect([...blankImage(1, 1, "white").data]).toEqual([255, 255, 255, 255]);
    expect([...blankImage(1, 1, "black").data]).toEqual([0, 0, 0, 255]);
    expect([...blankImage(1, 1, "transparent").data]).toEqual([0, 0, 0, 0]);
  });
  it("saves the background and reads older files as transparent", () => {
    const white = parsePigxel(serializePigxel(blankImage(2, 2, "white")));
    expect(white.background).toBe("white");
    const older = { ...valid };
    delete older.background;
    expect(parsePigxel(file(older)).background).toBe("transparent");
    expect(parsePigxel(file({ ...valid, background: "pink" })).background).toBe(
      "transparent",
    );
  });
});

describe("pigxelFileName", () => {
  it("adds the extension once and removes unsafe characters", () => {
    expect(pigxelFileName("Grass")).toBe("Grass.pigxel");
    expect(pigxelFileName("Grass.PIGXEL")).toBe("Grass.pigxel");
    expect(pigxelFileName('a/b\\c:*?"<>|')).toBe("abc.pigxel");
    expect(pigxelFileName("   ")).toBe("Untitled.pigxel");
  });
});
