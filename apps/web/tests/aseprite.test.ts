import { zlibSync } from "fflate";
import { describe, expect, it } from "vitest";
import { createLayer } from "@/lib/layers/tree";
import type { Layer } from "@/lib/layers/types";
import { readAseprite, writeAseprite } from "@/lib/pigxel-file/aseprite";
import type { PigxelDocument } from "@/lib/pigxel-file/format";
import { celOf, createFrame } from "@/lib/sprite/frames";

/** A w × h cel filled with one colour, transparent where `holes` says. */
const fill = (w: number, h: number, rgba: number[], holes: number[] = []) => {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) if (!holes.includes(i)) out.set(rgba, i * 4);
  return out;
};

describe(".aseprite files", () => {
  it("round-trips layers, groups, frames, palette and slices", () => {
    const bg = createLayer("background", "Background");
    const hero = {
      ...createLayer("normal", "Hero"),
      opacity: 128,
      blend: "multiply" as const,
    };
    const ref = { ...createLayer("reference", "Sketch"), visible: false };
    const inner = { ...createLayer("normal", "Shadow"), locked: true };
    const group = {
      ...createLayer("group", "Props"),
      collapsed: true,
      children: [inner],
    } as Layer;
    const [a, b] = [createFrame(80), createFrame(250)];
    const doc: PigxelDocument = {
      id: crypto.randomUUID(),
      width: 4,
      height: 3,
      background: "white",
      layers: [bg, hero, group, ref],
      frames: [a, b],
      cels: new Map([
        [
          a.id,
          new Map([
            [bg.id, fill(4, 3, [255, 255, 255, 255])],
            [hero.id, fill(4, 3, [255, 0, 0, 255], [0, 1, 2, 3, 4])],
            [inner.id, fill(4, 3, [0, 0, 0, 100], [0, 5, 11])],
          ]),
        ],
        [b.id, new Map([[hero.id, fill(4, 3, [0, 0, 255, 255], [11])]])],
      ]),
      palette: ["#ff0000", "#0000ff"],
      slices: [
        {
          id: "s",
          name: "door",
          bounds: { x: 1, y: 0, w: 3, h: 3 },
          center: { x: 1, y: 1, w: 1, h: 1 },
          pivot: { x: 1, y: 2 },
        },
      ],
    };
    const read = readAseprite(writeAseprite(doc));
    const shape = (layers: Layer[]): unknown =>
      layers.map((l) => ({
        name: l.name,
        kind: l.kind,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        blend: l.blend,
        ...(l.kind === "group" && {
          collapsed: l.collapsed,
          children: shape(l.children),
        }),
      }));
    expect(shape(read.layers)).toEqual(shape(doc.layers));
    expect([read.width, read.height, read.background]).toEqual([4, 3, "white"]);
    expect(read.frames.map((f) => f.duration)).toEqual([80, 250]);
    expect(read.palette).toEqual(doc.palette);
    expect(read.slices).toEqual([{ ...doc.slices[0], id: read.slices[0]!.id }]);
    const pixels = (frame: number, layer: number[]) => {
      let list: Layer[] = read.layers;
      let found: Layer | undefined;
      for (const i of layer) {
        found = list[i];
        list = found?.kind === "group" ? found.children : [];
      }
      return celOf(read.cels, read.frames[frame]!.id, found!.id);
    };
    expect([...pixels(0, [1])!]).toEqual([
      ...doc.cels.get(a.id)!.get(hero.id)!,
    ]);
    expect([...pixels(0, [2, 0])!]).toEqual([
      ...doc.cels.get(a.id)!.get(inner.id)!,
    ]);
    expect([...pixels(1, [1])!]).toEqual([
      ...doc.cels.get(b.id)!.get(hero.id)!,
    ]);
    expect(pixels(1, [2, 0])).toBeUndefined();
  });

  it("reads an indexed sprite with a linked cel", () => {
    const bytes: number[] = [];
    const u8 = (v: number) => bytes.push(v & 0xff);
    const u16 = (v: number) => (u8(v), u8(v >> 8));
    const u32 = (v: number) => (u16(v), u16(v >>> 16));
    const str = (s: string) => (
      u16(s.length),
      [...s].forEach((c) => u8(c.charCodeAt(0)))
    );
    const chunk = (type: number, body: () => void) => {
      const start = bytes.length;
      u32(0);
      u16(type);
      body();
      const size = bytes.length - start;
      [0, 1, 2, 3].forEach(
        (k) => (bytes[start + k] = (size >> (8 * k)) & 0xff),
      );
    };
    const frame = (chunks: () => void, count: number) => {
      const start = bytes.length;
      u32(0);
      u16(0xf1fa);
      u16(count);
      u16(120);
      u16(0);
      u32(count);
      chunks();
      const size = bytes.length - start;
      [0, 1, 2, 3].forEach(
        (k) => (bytes[start + k] = (size >> (8 * k)) & 0xff),
      );
    };
    // Header: 2 × 1, indexed, 2 frames, transparent index 0.
    u32(0);
    u16(0xa5e0);
    u16(2);
    u16(2);
    u16(1);
    u16(8);
    u32(1);
    u16(100);
    u32(0);
    u32(0);
    u8(0);
    u8(0);
    u8(0);
    u8(0);
    u16(3);
    while (bytes.length < 128) u8(0);
    frame(() => {
      chunk(0x2019, () => {
        u32(3);
        u32(0);
        u32(2);
        u32(0);
        u32(0);
        for (const c of [
          [0, 0, 0],
          [255, 0, 0],
          [0, 255, 0],
        ]) {
          u16(0);
          c.forEach(u8);
          u8(255);
        }
      });
      chunk(0x2004, () => {
        u16(1 | 2);
        u16(0);
        u16(0);
        u16(0);
        u16(0);
        u16(0);
        u8(255);
        u8(0);
        u8(0);
        u8(0);
        str("Coin");
      });
      chunk(0x2005, () => {
        u16(0);
        u16(0);
        u16(0);
        u8(255);
        u16(2);
        u16(0);
        for (let i = 0; i < 5; i++) u8(0);
        u16(2);
        u16(1);
        zlibSync(new Uint8Array([1, 0])).forEach(u8);
      });
    }, 3);
    frame(() => {
      chunk(0x2005, () => {
        u16(0);
        u16(0);
        u16(0);
        u8(255);
        u16(1);
        u16(0);
        for (let i = 0; i < 5; i++) u8(0);
        u16(0);
      });
    }, 1);
    const doc = readAseprite(new Uint8Array(bytes));
    expect(doc.frames.map((f) => f.duration)).toEqual([120, 120]);
    expect(doc.palette).toEqual(["#000000", "#ff0000", "#00ff00"]);
    const layer = doc.layers[0]!;
    for (const f of doc.frames)
      expect([...celOf(doc.cels, f.id, layer.id)!]).toEqual([
        255, 0, 0, 255, 0, 0, 0, 0,
      ]);
  });

  it("refuses other files and sprites too big for a tile", () => {
    expect(() => readAseprite(new Uint8Array(200))).toThrow(
      "isn’t an Aseprite file",
    );
    const big = new Uint8Array(
      writeAseprite({
        id: "x",
        width: 1,
        height: 1,
        background: "transparent",
        layers: [createLayer("normal", "L")],
        frames: [createFrame()],
        cels: new Map(),
        palette: [],
        slices: [],
      }),
    );
    new DataView(big.buffer).setUint16(8, 512, true);
    expect(() => readAseprite(big)).toThrow("at most 256");
  });
});
