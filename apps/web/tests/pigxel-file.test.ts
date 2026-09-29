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
import { celOf, createFrame } from "@/lib/sprite/frames";

function pixels(width: number, height: number, seed = 37) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * seed) % 256;
  return data;
}

/** A tile with one frame and one layer of patterned pixels. */
function document(width: number, height: number): PigxelDocument {
  const layer = createLayer("normal", "Layer 1");
  const frame = createFrame();
  return {
    width,
    height,
    background: "transparent",
    layers: [layer],
    frames: [frame],
    cels: new Map([[frame.id, new Map([[layer.id, pixels(width, height)]])]]),
  };
}

/** The pixels of the only layer in the first frame. */
const firstCel = (doc: PigxelDocument) =>
  celOf(doc.cels, doc.frames[0]!.id, doc.layers[0]!.id);

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
      expect(firstCel(parsed)).toEqual(firstCel(original));
    }
  });
  it("writes a versioned document with frames, layer settings and cels", () => {
    expect(valid).toMatchObject({
      format: "pigxel",
      version: 4,
      width: 2,
      height: 2,
      frames: [{ duration: 100 }],
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
    expect(valid.cels).toHaveLength(1);
    expect(valid.cels[0]).toMatchObject({
      frame: valid.frames[0].id,
      layer: valid.layers[0].id,
    });
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
    const frame = createFrame();
    const original: PigxelDocument = {
      width: 3,
      height: 2,
      background: "transparent",
      layers,
      frames: [frame],
      cels: new Map([
        [
          frame.id,
          new Map([
            [reference.id, pixels(3, 2, 11)],
            [inner.id, pixels(3, 2, 7)],
          ]),
        ],
      ]),
    };
    const parsed = parsePigxel(serializePigxel(original));
    expect(parsed.layers).toEqual(layers);
    expect(parsed.cels).toEqual(original.cels);
  });
  it("compresses cels: an empty 256×256 layer takes a few hundred bytes", () => {
    const doc = document(256, 256);
    const id = doc.layers[0]!.id;
    doc.cels
      .get(doc.frames[0]!.id)!
      .set(id, new Uint8ClampedArray(256 * 256 * 4));
    expect(serializePigxel(doc).length).toBeLessThan(1000);
  });
  it("round-trips frames in order, with durations and empty cels", () => {
    const doc = document(1, 1);
    const layer = doc.layers[0]!.id;
    const second = { ...createFrame(), duration: 250 };
    const third = createFrame(40);
    doc.frames.push(second, third);
    doc.cels.set(second.id, new Map());
    doc.cels.set(third.id, new Map([[layer, pixels(1, 1, 3)]]));
    const parsed = parsePigxel(serializePigxel(doc));
    expect(parsed.frames).toEqual(doc.frames);
    expect(parsed.cels).toEqual(doc.cels);
    expect(JSON.parse(serializePigxel(doc)).cels).toHaveLength(2);
  });
  it("rejects files that aren't Pigxel files", () => {
    for (const text of ["", "not json", "[]", file({ format: "png" })]) {
      expect(() => parsePigxel(text)).toThrow("isn’t a Pigxel file");
    }
  });
  it("rejects files from a newer version", () => {
    expect(() => parsePigxel(file({ ...valid, version: 5 }))).toThrow(
      "newer version",
    );
  });
  it("rejects invalid sizes, damaged pixels, kinds and frames", () => {
    for (const size of [0, 257, 1.5, "32"]) {
      expect(() => parsePigxel(file({ ...valid, width: size }))).toThrow(
        PigxelFileError,
      );
    }
    expect(() => parsePigxel(file({ ...valid, layers: [] }))).toThrow(
      "no pixels",
    );
    for (const broken of [
      { cels: [{ ...valid.cels[0], pixels: btoa("abc") }] },
      { cels: [{ ...valid.cels[0], pixels: "@@@" }] },
      { layers: [{ ...valid.layers[0], kind: "sticker" }] },
      { frames: [] },
      { cels: "none" },
    ]) {
      expect(() => parsePigxel(file({ ...valid, ...broken }))).toThrow(
        "damaged",
      );
    }
  });
  it("repairs what it can: opacity, blend, ids, durations, stray cels", () => {
    const layer = { ...valid.layers[0], opacity: 900, blend: "glow" };
    const frame = { ...valid.frames[0], duration: -5 };
    const stray = { ...valid.cels[0], layer: "missing" };
    const parsed = parsePigxel(
      file({
        ...valid,
        layers: [layer, layer],
        frames: [frame, frame],
        cels: [...valid.cels, stray],
      }),
    );
    const [a, b] = parsed.layers;
    expect(a).toMatchObject({ opacity: 255, blend: "normal" });
    expect(a!.id).not.toBe(b!.id);
    expect(parsed.frames[0]!.duration).toBe(1);
    expect(parsed.frames[0]!.id).not.toBe(parsed.frames[1]!.id);
    expect(parsed.cels.get(parsed.frames[0]!.id)!.size).toBe(1);
  });
});

describe("older files", () => {
  it("reads a version 3 file, whose cels aren't compressed", () => {
    const v3 = file({
      ...valid,
      version: 3,
      cels: [{ ...valid.cels[0], pixels: btoa("ÿ".repeat(4)) }],
    });
    expect([...firstCel(parsePigxel(v3))!]).toEqual(
      Array(4).fill([1, 2, 3, 255]).flat(),
    );
  });

  it("reads a version 2 file as one frame", () => {
    const v2 = file({
      format: "pigxel",
      version: 2,
      width: 1,
      height: 1,
      layers: [
        {
          id: "ink",
          name: "Ink",
          kind: "normal",
          opacity: 255,
          pixels: btoa("\x01\x02\x03\xff"),
        },
      ],
    });
    const parsed = parsePigxel(v2);
    expect(parsed.frames).toHaveLength(1);
    expect([...firstCel(parsed)!]).toEqual([1, 2, 3, 255]);
  });

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
  it("reads each version 1 layer, turning 0–1 opacity into 0–255", () => {
    const parsed = parsePigxel(v1("transparent"));
    expect(
      parsed.layers.map((l) => [l.name, l.kind, l.visible, l.opacity]),
    ).toEqual([
      ["Layer 1", "normal", true, 255],
      ["Ink", "normal", false, 128],
    ]);
    expect(parsed.cels.get(parsed.frames[0]!.id)!.size).toBe(2);
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
    expect(white.frames).toHaveLength(1);
    expect([...flattenDocument(white)]).toEqual([255, 255, 255, 255]);
    const clear = blankDocument(1, 1, "transparent");
    expect(clear.layers.map((l) => l.kind)).toEqual(["normal"]);
    expect([...flattenDocument(clear)]).toEqual([0, 0, 0, 0]);
  });
  it("leaves references out and flattens the frame asked for", () => {
    const doc = blankDocument(1, 1, "transparent");
    const [frame] = doc.frames;
    const reference = createLayer("reference", "Reference 1");
    doc.layers.push(reference);
    doc.cels
      .get(frame!.id)!
      .set(reference.id, new Uint8ClampedArray([9, 9, 9, 255]));
    expect([...flattenDocument(doc)]).toEqual([0, 0, 0, 0]);
    expect([...flattenDocument(doc, [])]).toEqual([9, 9, 9, 255]);
    const second = createFrame();
    doc.frames.push(second);
    expect([...flattenDocument(doc, [], second.id)]).toEqual([0, 0, 0, 0]);
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
