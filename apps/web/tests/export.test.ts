import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPORT,
  type ExportSettings,
} from "@/features/editor/export/constants";
import {
  exportFiles,
  exportSize,
  fitsCanvas,
  onColor,
  type ExportSource,
} from "@/features/editor/export/export";
import { encodeApng } from "@/features/editor/export/apng";
import { encodeGif, toIndexed } from "@/features/editor/export/gif";
import { encodeWebp } from "@/features/editor/export/webp";
import {
  PLAIN_SHEET,
  packSheet,
  sheetData,
  sheetGrid,
  type SheetItem,
} from "@/features/editor/export/sheet";

const solid = (w: number, h: number, rgba: number[]) => {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < out.length; p += 4) out.set(rgba, p);
  return out;
};

const pixel = (rgba: Uint8ClampedArray, w: number, x: number, y: number) => [
  ...rgba.subarray((y * w + x) * 4, (y * w + x) * 4 + 4),
];

function decodeGif(bytes: Uint8Array) {
  let pos = 0;
  const u8 = () => bytes[pos++]!;
  const u16 = () => u8() | (u8() << 8);
  const skipBlocks = () => {
    for (let n = u8(); n; n = u8()) pos += n;
  };
  const header = String.fromCharCode(...bytes.subarray(0, 6));
  pos = 6;
  const width = u16();
  const height = u16();
  const packed = u8();
  pos += 2;
  const palette: number[][] = [];
  for (let i = 0; i < 2 << (packed & 7); i++) palette.push([u8(), u8(), u8()]);

  let loops = false;
  let delay = 0;
  let transparent: number | null = null;
  let disposal = 0;
  const frames: {
    indices: number[];
    delay: number;
    transparent: number | null;
    disposal: number;
  }[] = [];
  for (;;) {
    const kind = u8();
    if (kind === 0x3b) break;
    if (kind === 0x21) {
      const label = u8();
      if (label === 0xf9) {
        u8();
        const flags = u8();
        delay = u16();
        const index = u8();
        u8();
        disposal = (flags >> 2) & 7;
        transparent = flags & 1 ? index : null;
      } else {
        if (label === 0xff) loops = true;
        skipBlocks();
      }
    } else if (kind === 0x2c) {
      pos += 9;
      const minCode = u8();
      const data: number[] = [];
      for (let n = u8(); n; n = u8())
        for (let i = 0; i < n; i++) data.push(u8());
      frames.push({
        indices: lzwDecode(data, minCode),
        delay,
        transparent,
        disposal,
      });
    } else throw new Error(`Unexpected block ${kind}`);
  }
  return { header, width, height, palette, loops, frames };
}

function lzwDecode(data: number[], minCode: number): number[] {
  const clear = 1 << minCode;
  const end = clear + 1;
  let codeSize = 0;
  let table: number[][] = [];
  let prev: number[] | null = null;
  const reset = () => {
    table = Array.from({ length: clear }, (_, i) => [i]);
    table.push([], []);
    codeSize = minCode + 1;
    prev = null;
  };
  reset();
  let bit = 0;
  const read = () => {
    let code = 0;
    for (let i = 0; i < codeSize; i++, bit++)
      code |= ((data[bit >> 3]! >> (bit & 7)) & 1) << i;
    return code;
  };
  const out: number[] = [];
  for (;;) {
    const code = read();
    if (code === clear) {
      reset();
      continue;
    }
    if (code === end) return out;
    const entry: number[] =
      code < table.length ? table[code]! : [...prev!, prev![0]!];
    out.push(...entry);
    if (prev) table.push([...(prev as number[]), entry[0]!]);
    prev = entry;
    if (table.length === 1 << codeSize && codeSize < 12) codeSize++;
  }
}

function framePixels(gif: ReturnType<typeof decodeGif>, n: number) {
  const frame = gif.frames[n]!;
  const out = new Uint8ClampedArray(frame.indices.length * 4);
  frame.indices.forEach((index, i) => {
    if (index !== frame.transparent)
      out.set([...gif.palette[index]!, 255], i * 4);
  });
  return out;
}

describe("sprite sheets", () => {
  it("lays frames out in a row, a column or a near-square grid", () => {
    expect(sheetGrid(5, "row")).toEqual({ cols: 5, rows: 1 });
    expect(sheetGrid(5, "column")).toEqual({ cols: 1, rows: 5 });
    expect(sheetGrid(5, "grid")).toEqual({ cols: 3, rows: 2 });
    expect(sheetGrid(4, "grid")).toEqual({ cols: 2, rows: 2 });
    expect(sheetGrid(1, "grid")).toEqual({ cols: 1, rows: 1 });
  });

  const items = (colors: number[][], w = 2, h = 3): SheetItem[] =>
    colors.map((c, n) => ({
      name: `Hero ${n}.png`,
      image: { rgba: solid(w, h, c), w, h },
      duration: 100 * (n + 1),
      group: 0,
    }));

  it("puts each frame in its cell", () => {
    const colors = [
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ];
    const { image: sheet } = packSheet(
      items(colors),
      { ...PLAIN_SHEET, layout: "grid" },
      1,
    );
    expect(sheet.w).toBe(4);
    expect(sheet.h).toBe(6);
    expect(pixel(sheet.rgba, 4, 1, 2)).toEqual(colors[0]);
    expect(pixel(sheet.rgba, 4, 2, 0)).toEqual(colors[1]);
    expect(pixel(sheet.rgba, 4, 0, 3)).toEqual(colors[2]);
    expect(pixel(sheet.rgba, 4, 3, 5)).toEqual([0, 0, 0, 0]);
  });

  it("describes the frames in Aseprite's JSON", () => {
    const packed = packSheet(
      items(
        [
          [1, 1, 1, 255],
          [2, 2, 2, 255],
          [3, 3, 3, 255],
        ],
        16,
        8,
      ),
      PLAIN_SHEET,
      2,
    );
    const data = sheetData({
      image: "Hero-sheet.png",
      size: packed.image,
      frames: packed.frames,
      json: "array",
      scale: 2,
    });
    if (!Array.isArray(data.frames)) throw new Error("expected an array");
    expect(data.frames.map((f) => f.frame)).toEqual([
      { x: 0, y: 0, w: 32, h: 16 },
      { x: 32, y: 0, w: 32, h: 16 },
      { x: 64, y: 0, w: 32, h: 16 },
    ]);
    expect(data.frames.map((f) => f.duration)).toEqual([100, 200, 300]);
    expect(data.frames[1]!.filename).toBe("Hero 1.png");
    expect(data.meta).toMatchObject({
      image: "Hero-sheet.png",
      size: { w: 96, h: 16 },
      scale: "2",
    });
  });

  it("adds a border, gaps between frames and padding inside each one", () => {
    const packed = packSheet(
      items(
        [
          [1, 1, 1, 255],
          [2, 2, 2, 255],
        ],
        2,
        2,
      ),
      { ...PLAIN_SHEET, border: 1, spacing: 2, inner: 1 },
      1,
    );
    expect([packed.image.w, packed.image.h]).toEqual([12, 6]);
    expect(packed.frames.map((f) => f.frame)).toEqual([
      { x: 2, y: 2, w: 2, h: 2 },
      { x: 8, y: 2, w: 2, h: 2 },
    ]);
  });

  it("trims empty edges, merges equal frames and skips empty ones", () => {
    const dot = new Uint8ClampedArray(4 * 4 * 4);
    dot.set([9, 9, 9, 255], (1 * 4 + 2) * 4);
    const list: SheetItem[] = [dot, dot, new Uint8ClampedArray(64)].map(
      (rgba, n) => ({
        name: `f${n}`,
        image: { rgba, w: 4, h: 4 },
        duration: 100,
        group: 0,
      }),
    );
    const packed = packSheet(
      list,
      { ...PLAIN_SHEET, trim: true, merge: true, skipEmpty: true },
      1,
    );
    expect([packed.image.w, packed.image.h]).toEqual([1, 1]);
    expect(packed.frames).toHaveLength(2);
    expect(packed.frames[1]!.frame).toEqual(packed.frames[0]!.frame);
    expect(packed.frames[0]).toMatchObject({
      trimmed: true,
      source: { x: 2, y: 1, w: 1, h: 1 },
      sourceSize: { w: 4, h: 4 },
    });
  });

  it("puts each group on its own row and packs tightly", () => {
    const list = items([
      [1, 1, 1, 255],
      [2, 2, 2, 255],
      [3, 3, 3, 255],
    ]).map((item, n) => ({ ...item, group: n === 2 ? 1 : 0 }));
    const rows = packSheet(list, PLAIN_SHEET, 1);
    expect([rows.image.w, rows.image.h]).toEqual([4, 6]);
    const packed = packSheet(
      items([
        [1, 1, 1, 255],
        [2, 2, 2, 255],
        [3, 3, 3, 255],
        [4, 4, 4, 255],
      ]),
      { ...PLAIN_SHEET, layout: "packed" },
      1,
    );
    expect(packed.image.w * packed.image.h).toBe(24);
  });

  it("writes JSON hash keyed by file name", () => {
    const packed = packSheet(items([[1, 1, 1, 255]]), PLAIN_SHEET, 1);
    const data = sheetData({
      image: "a.png",
      size: packed.image,
      frames: packed.frames,
      json: "hash",
      scale: 1,
    });
    expect(Object.keys(data.frames)).toEqual(["Hero 0.png"]);
  });
});

describe("GIF", () => {
  it("keeps every colour exact when there are few", () => {
    const frame = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 255, 1, 2, 3, 200,
    ]);
    const { palette, transparent, frames } = toIndexed([frame]);
    expect(palette).toEqual([
      { r: 255, g: 0, b: 0 },
      { r: 1, g: 2, b: 3 },
    ]);
    expect(transparent).toBe(2);
    expect([...frames[0]!]).toEqual([0, 2, 0, 1]);
  });

  it("cuts the palette down to 255 colours", () => {
    const frame = new Uint8ClampedArray(1000 * 4);
    for (let i = 0; i < 1000; i++)
      frame.set([i % 256, (i * 7) % 256, (i * 13) % 256, 255], i * 4);
    const { palette, transparent, frames } = toIndexed([frame]);
    expect(palette.length).toBe(255);
    expect(transparent).toBeNull();
    expect(Math.max(...frames[0]!)).toBeLessThan(255);
  });

  it("writes a looping animation a GIF reader reads back", () => {
    const w = 3;
    const h = 2;
    const red = [255, 0, 0, 255];
    const blue = [0, 0, 255, 255];
    const a = solid(w, h, red);
    const b = solid(w, h, blue);
    b.set([0, 0, 0, 0], 0);
    const gif = decodeGif(
      encodeGif(
        [
          { rgba: a, duration: 100 },
          { rgba: b, duration: 5 },
        ],
        w,
        h,
      ),
    );
    expect(gif.header).toBe("GIF89a");
    expect([gif.width, gif.height]).toEqual([w, h]);
    expect(gif.loops).toBe(true);
    expect(gif.frames.map((f) => f.delay)).toEqual([10, 2]);
    expect(gif.frames.every((f) => f.disposal === 2)).toBe(true);
    expect(framePixels(gif, 0)).toEqual(a);
    expect(framePixels(gif, 1)).toEqual(b);
  });

  it("compresses big, busy pictures correctly", () => {
    const w = 200;
    const h = 150;
    const rgba = new Uint8ClampedArray(w * h * 4);
    let seed = 1;
    for (let i = 0; i < w * h; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const c = seed % 200;
      rgba.set([c, 255 - c, (c * 3) % 256, 255], i * 4);
    }
    const gif = decodeGif(encodeGif([{ rgba, duration: 100 }], w, h));
    expect(framePixels(gif, 0)).toEqual(rgba);
  });

  it("encodes a fully transparent frame", () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4);
    const gif = decodeGif(encodeGif([{ rgba, duration: 100 }], 4, 4));
    expect(framePixels(gif, 0)).toEqual(rgba);
  });
});

describe("exporting a tile", () => {
  const red = [255, 0, 0, 255];
  const halfBlue = [0, 0, 255, 128];
  const source: ExportSource = {
    name: "Hero.pigxel",
    size: { w: 2, h: 2 },
    frames: [
      { id: "f1", duration: 100 },
      { id: "f2", duration: 200 },
    ],
    frameId: "f2",
    background: "transparent",
    picture: (id) => solid(2, 2, id === "f1" ? red : halfBlue),
    slices: [],
  };
  const settings = (patch: Partial<ExportSettings>): ExportSettings => ({
    ...DEFAULT_EXPORT,
    ...patch,
  });

  it("saves the frame on screen as a PNG, scaled up crisply", () => {
    const [file, ...rest] = exportFiles(source, settings({ scale: 3 }));
    expect(rest).toEqual([]);
    expect(file!.name).toBe("Hero.png");
    expect(file!.mime).toBe("image/png");
    if (!("image" in file!)) throw new Error("expected a picture");
    expect([file.image.w, file.image.h]).toEqual([6, 6]);
    expect(pixel(file.image.rgba, 6, 5, 5)).toEqual(halfBlue);
  });

  it("puts a JPEG on the tile's background, white when transparent", () => {
    const [file] = exportFiles(source, settings({ format: "jpeg" }));
    if (!("image" in file!)) throw new Error("expected a picture");
    expect(file.name).toBe("Hero.jpg");
    expect(pixel(file.image.rgba, 2, 0, 0)).toEqual([127, 127, 255, 255]);

    const [black] = exportFiles(
      { ...source, background: "black" },
      settings({ format: "jpeg" }),
    );
    if (!("image" in black!)) throw new Error("expected a picture");
    expect(pixel(black.image.rgba, 2, 0, 0)).toEqual([0, 0, 128, 255]);
  });

  it("saves every frame in a GIF with their durations", () => {
    const [file] = exportFiles(source, settings({ format: "gif", scale: 2 }));
    if (!("data" in file!) || typeof file.data === "string")
      throw new Error("expected bytes");
    expect(file.name).toBe("Hero.gif");
    const gif = decodeGif(file.data);
    expect([gif.width, gif.height]).toEqual([4, 4]);
    expect(gif.frames.map((f) => f.delay)).toEqual([10, 20]);
    expect(framePixels(gif, 0)).toEqual(solid(4, 4, red));
  });

  it("saves each slice of the frame on screen, named after it", () => {
    const wide: ExportSource = {
      ...source,
      size: { w: 4, h: 2 },
      picture: () => {
        const rgba = solid(4, 2, red);
        rgba.set(halfBlue, 3 * 4);
        return rgba;
      },
      slices: [
        {
          id: "a",
          name: "door",
          bounds: { x: 2, y: 0, w: 2, h: 2 },
          center: null,
          pivot: null,
        },
        {
          id: "b",
          name: "door",
          bounds: { x: 3, y: 1, w: 5, h: 5 },
          center: null,
          pivot: null,
        },
        {
          id: "c",
          name: "gone",
          bounds: { x: 9, y: 9, w: 2, h: 2 },
          center: null,
          pivot: null,
        },
      ],
    };
    const files = exportFiles(wide, settings({ format: "slices", scale: 2 }));
    expect(files.map((f) => f.name)).toEqual(["door.png", "door 2.png"]);
    const [door, cut] = files;
    if (!("image" in door!) || !("image" in cut!))
      throw new Error("expected pictures");
    expect([door.image.w, door.image.h]).toEqual([4, 4]);
    expect(pixel(door.image.rgba, 4, 2, 0)).toEqual(halfBlue);
    expect([cut.image.w, cut.image.h]).toEqual([2, 2]);
  });

  it("lists slices in sheet data, scaled, as Aseprite does", () => {
    const [, json] = exportFiles(
      {
        ...source,
        slices: [
          {
            id: "a",
            name: "frame",
            bounds: { x: 0, y: 0, w: 2, h: 2 },
            center: { x: 1, y: 1, w: 0, h: 0 },
            pivot: null,
          },
        ],
      },
      settings({ format: "sheet", sheetData: true, scale: 3 }),
    );
    if (!("data" in json!) || typeof json.data !== "string")
      throw new Error("expected text");
    expect(JSON.parse(json.data).meta.slices).toEqual([
      {
        name: "frame",
        color: "#0000ffff",
        keys: [
          {
            frame: 0,
            bounds: { x: 0, y: 0, w: 6, h: 6 },
            center: { x: 3, y: 3, w: 0, h: 0 },
          },
        ],
      },
    ]);
  });

  it("saves a sheet and, when asked, its JSON", () => {
    const files = exportFiles(
      source,
      settings({ format: "sheet", layout: "column", sheetData: true }),
    );
    expect(files.map((f) => f.name)).toEqual([
      "Hero-sheet.png",
      "Hero-sheet.json",
    ]);
    const [sheet, json] = files;
    if (!("image" in sheet!)) throw new Error("expected a picture");
    expect([sheet.image.w, sheet.image.h]).toEqual([2, 4]);
    expect(pixel(sheet.image.rgba, 2, 0, 3)).toEqual(halfBlue);
    if (!("data" in json!) || typeof json.data !== "string")
      throw new Error("expected text");
    expect(JSON.parse(json.data).meta.image).toBe("Hero-sheet.png");
  });

  it("knows how big the picture gets and whether a browser can draw it", () => {
    const tile = { w: 256, h: 256 };
    expect(exportSize(settings({ scale: 4 }), tile, 10)).toEqual({
      w: 1024,
      h: 1024,
    });
    const sheet = exportSize(
      settings({ format: "sheet", layout: "row", scale: 8 }),
      tile,
      10,
    );
    expect(sheet).toEqual({ w: 20480, h: 2048 });
    expect(fitsCanvas(sheet)).toBe(false);
  });

  it("flattens semi-transparent pixels onto a colour", () => {
    expect([
      ...onColor(
        new Uint8ClampedArray([255, 0, 0, 0, 0, 255, 0, 255]),
        "#102030",
      ),
    ]).toEqual([16, 32, 48, 255, 0, 255, 0, 255]);
  });
});

describe("animated PNG and WebP", () => {
  const frames = [
    { rgba: solid(2, 2, [255, 0, 0, 128]), duration: 100 },
    { rgba: solid(2, 2, [0, 0, 255, 255]), duration: 250 },
  ];
  const text = (bytes: Uint8Array, at: number) =>
    String.fromCharCode(...bytes.subarray(at, at + 4));
  const count = (bytes: Uint8Array, tag: string) => {
    let n = 0;
    for (let i = 0; i < bytes.length - 3; i++) if (text(bytes, i) === tag) n++;
    return n;
  };

  it("writes an APNG with a control chunk per frame", () => {
    const png = encodeApng(frames, 2, 2);
    expect([...png.subarray(1, 4)]).toEqual([80, 78, 71]);
    expect(count(png, "acTL")).toBe(1);
    expect(count(png, "fcTL")).toBe(2);
    expect(count(png, "fdAT")).toBe(1);
  });

  it("writes a lossless animated WebP with one frame chunk per frame", () => {
    const webp = encodeWebp(frames, 2, 2);
    expect(text(webp, 0)).toBe("RIFF");
    expect(text(webp, 8)).toBe("WEBP");
    expect(count(webp, "ANMF")).toBe(2);
    expect(count(webp, "VP8L")).toBe(2);
  });
});
