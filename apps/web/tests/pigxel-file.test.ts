import { describe, expect, it } from "vitest";
import { createLayer } from "@/lib/layers/tree";
import type { Layer } from "@/lib/layers/types";
import {
  PigxelFileError,
  blankDocument,
  flattenDocument,
  parsePigxel,
  pigxelFileName,
  serializePigxel,
  type PigxelDocument,
} from "@/lib/pigxel-file/format";

function pixels(width: number, height: number, seed = 37) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * seed) % 256;
  return data;
}

/** A tile with one layer of patterned pixels. */
function document(width: number, height: number): PigxelDocument {
  const layer = createLayer("normal", "Layer 1");
  return {
    width,
    height,
    background: "transparent",
    layers: [layer],
    pixels: new Map([[layer.id, pixels(width, height)]]),
  };
}

const file = (value: unknown) => JSON.stringify(value);
const valid = JSON.parse(serializePigxel(document(2, 2)));

describe(".pigxel format", () => {
  it("round-trips every pixel, including transparency", () => {
    for (const original of [
      document(1, 1),
      document(32, 32),
      document(256, 200),
    ]) {
      const parsed = parsePigxel(serializePigxel(original));
      expect(parsed.width).toBe(original.width);
      expect(parsed.height).toBe(original.height);
      const id = original.layers[0]!.id;
      expect(parsed.pixels.get(id)).toEqual(original.pixels.get(id));
    }
  });
  it("writes a versioned document with the layer settings", () => {
    expect(valid).toMatchObject({
      format: "pigxel",
      version: 2,
      width: 2,
      height: 2,
      layers: [
        {
          name: "Layer 1",
          kind: "normal",
          visible: true,
          locked: false,
          opacity: 255,
          blend: "normal",
        },
      ],
    });
    expect(typeof valid.layers[0].pixels).toBe("string");
  });
  it("round-trips a layer tree with groups and every setting", () => {
    const group = createLayer("group", "Group 1");
    const inner = createLayer("normal", "Shadow");
    const reference = createLayer("reference", "Reference 1");
    const layers: Layer[] = [
      { ...reference, visible: false, locked: true },
      {
        ...group,
        collapsed: true,
        opacity: 128,
        blend: "screen",
        children: [{ ...inner, blend: "multiply", opacity: 40 }],
      } as Layer,
    ];
    const original: PigxelDocument = {
      width: 3,
      height: 2,
      background: "transparent",
      layers,
      pixels: new Map([
        [reference.id, pixels(3, 2, 11)],
        [inner.id, pixels(3, 2, 7)],
      ]),
    };
    const parsed = parsePigxel(serializePigxel(original));
    expect(parsed.layers).toEqual(layers);
    expect(parsed.pixels).toEqual(original.pixels);
  });
  it("rejects files that aren't Pigxel files", () => {
    for (const text of ["", "not json", "[]", file({ format: "png" })]) {
      expect(() => parsePigxel(text)).toThrow("isn’t a Pigxel file");
    }
  });
  it("rejects files from a newer version", () => {
    expect(() => parsePigxel(file({ ...valid, version: 3 }))).toThrow(
      "newer version",
    );
  });
  it("rejects invalid sizes, damaged pixels and unknown layer kinds", () => {
    for (const size of [0, 257, 1.5, "32"]) {
      expect(() => parsePigxel(file({ ...valid, width: size }))).toThrow(
        PigxelFileError,
      );
    }
    expect(() => parsePigxel(file({ ...valid, layers: [] }))).toThrow(
      "no pixels",
    );
    for (const layer of [
      { ...valid.layers[0], pixels: btoa("abc") },
      { ...valid.layers[0], pixels: "@@@" },
      { ...valid.layers[0], kind: "sticker" },
    ]) {
      expect(() => parsePigxel(file({ ...valid, layers: [layer] }))).toThrow(
        "damaged",
      );
    }
  });
  it("repairs settings it can: opacity, blend mode, repeated ids", () => {
    const layer = { ...valid.layers[0], opacity: 900, blend: "glow" };
    const parsed = parsePigxel(file({ ...valid, layers: [layer, layer] }));
    const [a, b] = parsed.layers;
    expect(a).toMatchObject({ opacity: 255, blend: "normal" });
    expect(a!.id).not.toBe(b!.id);
    expect(parsed.pixels.size).toBe(2);
  });
});

describe("version 1 files", () => {
  const v1 = (background: string) =>
    file({
      format: "pigxel",
      version: 1,
      width: 1,
      height: 1,
      background,
      layers: [
        {
          name: "Layer 1",
          visible: true,
          opacity: 1,
          pixels: btoa("\xff\xff\xff\xff"),
        },
        {
          name: "Ink",
          visible: false,
          opacity: 0.5,
          pixels: btoa("\x00\x00\x00\xff"),
        },
      ],
    });
  it("reads each layer, turning 0–1 opacity into 0–255", () => {
    const parsed = parsePigxel(v1("transparent"));
    expect(
      parsed.layers.map((l) => [l.name, l.kind, l.visible, l.opacity]),
    ).toEqual([
      ["Layer 1", "normal", true, 255],
      ["Ink", "normal", false, 128],
    ]);
  });
  it("makes the first layer the Background of a white or black tile", () => {
    const parsed = parsePigxel(v1("white"));
    expect(parsed.background).toBe("white");
    expect(parsed.layers[0]!.kind).toBe("background");
  });
});

describe("new tiles and flattening", () => {
  it("starts a coloured tile with a Background and a layer to draw on", () => {
    const white = blankDocument(1, 1, "white");
    expect(white.layers.map((l) => l.kind)).toEqual(["background", "normal"]);
    expect([...flattenDocument(white)]).toEqual([255, 255, 255, 255]);
    const clear = blankDocument(1, 1, "transparent");
    expect(clear.layers.map((l) => l.kind)).toEqual(["normal"]);
    expect([...flattenDocument(clear)]).toEqual([0, 0, 0, 0]);
  });
  it("leaves references out of the flattened picture", () => {
    const doc = blankDocument(1, 1, "transparent");
    const reference = createLayer("reference", "Reference 1");
    doc.layers.push(reference);
    doc.pixels.set(reference.id, new Uint8ClampedArray([9, 9, 9, 255]));
    expect([...flattenDocument(doc)]).toEqual([0, 0, 0, 0]);
    expect([...flattenDocument(doc, [])]).toEqual([9, 9, 9, 255]);
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
