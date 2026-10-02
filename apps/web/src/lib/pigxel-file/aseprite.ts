import { unzlibSync, zlibSync } from "fflate";
import { BLEND_MODES, MAX_OPACITY } from "@/lib/layers/constants";
import { createLayer, pixelLayerIds } from "@/lib/layers/tree";
import type { Layer } from "@/lib/layers/types";
import { DEFAULT_PALETTE, MAX_PALETTE } from "@/lib/palette/presets";
import type { Slice } from "@/lib/slices/slices";
import { DEFAULT_FRAME_DURATION } from "@/lib/sprite/constants";
import { celOf, clampDuration, createFrame } from "@/lib/sprite/frames";
import type { Cels } from "@/lib/sprite/types";
import {
  MAX_PIGXEL_SIZE,
  PigxelFileError,
  type PigxelDocument,
} from "./format";

/**
 * Aseprite's own file format (.aseprite / .ase), as its specification
 * describes it (docs/ase-file-specs.md in the Aseprite repository).
 *
 * Read: RGBA, grayscale and indexed sprites; layers with groups, the
 * Background, references, blend modes and opacity; every frame with its
 * duration; linked cels; tilemap layers (drawn out as ordinary pixels);
 * the palette; slices. Tags, user data, cel z-index and colour profiles
 * have no place in a Pigxel tile yet and are left out.
 *
 * Written: an RGBA sprite with the same layers, frames, palette and slices.
 */

export const ASEPRITE_EXTENSIONS = [".aseprite", ".ase"];

const ASEPRITE_FILE = /\.(aseprite|ase)$/i;

/** Whether a chosen file is an Aseprite file. */
export const isAsepriteFile = (name: string) => ASEPRITE_FILE.test(name);

/** The file's name without .aseprite or .ase, for the tile. */
export const asepriteBaseName = (name: string) =>
  name.replace(ASEPRITE_FILE, "") || "Untitled";

const HEADER_MAGIC = 0xa5e0;
const FRAME_MAGIC = 0xf1fa;
const HEADER_SIZE = 128;
const FRAME_HEADER_SIZE = 16;

const CHUNK = {
  oldPalette: 0x0004,
  layer: 0x2004,
  cel: 0x2005,
  palette: 0x2019,
  slice: 0x2022,
  tileset: 0x2023,
} as const;

/** Header flags: layer opacity is valid; groups have their own blend and opacity. */
const OPACITY_VALID = 1;
const GROUP_BLEND_VALID = 2;
const HAS_UUIDS = 4;

const LAYER_FLAG = {
  visible: 1,
  editable: 2,
  background: 8,
  collapsed: 32,
  reference: 64,
} as const;

const DAMAGED = () => new PigxelFileError("This Aseprite file is damaged.");

class Reader {
  pos = 0;
  private view: DataView;
  constructor(private bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  private need(n: number) {
    if (this.pos + n > this.bytes.length) throw DAMAGED();
  }
  u8() {
    this.need(1);
    return this.view.getUint8(this.pos++);
  }
  u16() {
    this.need(2);
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }
  i16() {
    this.need(2);
    const v = this.view.getInt16(this.pos, true);
    this.pos += 2;
    return v;
  }
  u32() {
    this.need(4);
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  i32() {
    this.need(4);
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }
  skip(n: number) {
    this.need(n);
    this.pos += n;
  }
  bytesTo(end: number) {
    if (end > this.bytes.length || end < this.pos) throw DAMAGED();
    const out = this.bytes.subarray(this.pos, end);
    this.pos = end;
    return out;
  }
  take(n: number) {
    return this.bytesTo(this.pos + n);
  }
  string() {
    return new TextDecoder().decode(this.take(this.u16()));
  }
}

/** zlib data, as Aseprite writes it. */
function inflate(data: Uint8Array) {
  try {
    return unzlibSync(data);
  } catch {
    throw DAMAGED();
  }
}

type FileLayer = {
  layer: Layer;
  level: number;
  tileset: number | null;
};

/** A cel as stored: an image somewhere on the tile, or a link to another frame's. */
type FileCel =
  | { link: number }
  | {
      x: number;
      y: number;
      w: number;
      h: number;
      opacity: number;
      rgba: Uint8ClampedArray;
    };

type Tileset = {
  tileW: number;
  tileH: number;
  count: number;
  rgba: Uint8ClampedArray;
};

/** Reads a .aseprite / .ase file as a tile, throwing a PigxelFileError with a user-facing message. */
export function readAseprite(bytes: Uint8Array): PigxelDocument {
  const r = new Reader(bytes);
  if (bytes.length < HEADER_SIZE) throw DAMAGED();
  r.skip(4);
  if (r.u16() !== HEADER_MAGIC)
    throw new PigxelFileError("This isn’t an Aseprite file.");
  const frameCount = r.u16();
  const width = r.u16();
  const height = r.u16();
  const depth = r.u16();
  const flags = r.u32();
  const speed = r.u16();
  r.skip(8);
  const transparentIndex = r.u8();
  r.pos = HEADER_SIZE;
  if (
    width < 1 ||
    height < 1 ||
    width > MAX_PIGXEL_SIZE ||
    height > MAX_PIGXEL_SIZE
  )
    throw new PigxelFileError(
      `Pigxel tiles can be at most ${MAX_PIGXEL_SIZE} × ${MAX_PIGXEL_SIZE} px; this sprite is ${width} × ${height}.`,
    );
  if (depth !== 32 && depth !== 16 && depth !== 8) throw DAMAGED();
  if (!frameCount) throw DAMAGED();

  const layers: FileLayer[] = [];
  let palette: number[][] = [];
  let sawNewPalette = false;
  const tilesets = new Map<number, Tileset>();
  const slices: Slice[] = [];
  const durations: number[] = [];
  const fileCels: Map<number, FileCel>[] = [];

  // A pixel of the sprite's colour mode as RGBA; indexed pixels need the palette.
  const bytesPerPixel = depth / 8;
  const toRgba = (
    raw: Uint8Array,
    count: number,
    background: boolean,
  ): Uint8ClampedArray => {
    const out = new Uint8ClampedArray(count * 4);
    if (raw.length < count * bytesPerPixel) throw DAMAGED();
    for (let i = 0; i < count; i++) {
      if (depth === 32) out.set(raw.subarray(i * 4, i * 4 + 4), i * 4);
      else if (depth === 16) {
        const v = raw[i * 2]!;
        out.set([v, v, v, raw[i * 2 + 1]!], i * 4);
      } else {
        const index = raw[i]!;
        if (index === transparentIndex && !background) continue;
        const c = palette[index];
        if (c) out.set(c, i * 4);
      }
    }
    return out;
  };

  for (let f = 0; f < frameCount; f++) {
    const frameStart = r.pos;
    const frameBytes = r.u32();
    if (r.u16() !== FRAME_MAGIC) throw DAMAGED();
    const oldChunks = r.u16();
    const duration = r.u16();
    r.skip(2);
    const newChunks = r.u32();
    durations.push(duration || speed || DEFAULT_FRAME_DURATION);
    const cels = new Map<number, FileCel>();
    fileCels.push(cels);
    const chunks = newChunks || oldChunks;
    for (let c = 0; c < chunks; c++) {
      const chunkStart = r.pos;
      const size = r.u32();
      const type = r.u16();
      const end = chunkStart + size;
      if (size < 6 || end > bytes.length) throw DAMAGED();
      if (type === CHUNK.layer) {
        const lf = r.u16();
        const kind = r.u16();
        const level = r.u16();
        r.skip(4);
        const blend = r.u16();
        const opacity = r.u8();
        r.skip(3);
        const name = r.string().slice(0, 100) || "Layer";
        const tileset = kind === 2 ? r.u32() : null;
        if (flags & HAS_UUIDS) r.skip(16);
        const isGroup = kind === 1;
        const pixelKind =
          lf & LAYER_FLAG.reference
            ? "reference"
            : lf & LAYER_FLAG.background
              ? "background"
              : "normal";
        const base = createLayer(isGroup ? "group" : pixelKind, name);
        const opacityValid =
          flags & OPACITY_VALID && (!isGroup || flags & GROUP_BLEND_VALID);
        const blendValid = !isGroup || flags & GROUP_BLEND_VALID;
        const settings = {
          visible: (lf & LAYER_FLAG.visible) !== 0,
          locked: (lf & LAYER_FLAG.editable) === 0,
          opacity:
            pixelKind === "background" || !opacityValid ? MAX_OPACITY : opacity,
          blend:
            pixelKind === "background" || !blendValid
              ? ("normal" as const)
              : (BLEND_MODES[blend]?.id ?? "normal"),
        };
        layers.push({
          layer:
            base.kind === "group"
              ? {
                  ...base,
                  ...settings,
                  collapsed: (lf & LAYER_FLAG.collapsed) !== 0,
                }
              : { ...base, ...settings },
          level,
          tileset,
        });
      } else if (type === CHUNK.cel) {
        const layerIndex = r.u16();
        const x = r.i16();
        const y = r.i16();
        const opacity = r.u8();
        const celType = r.u16();
        r.skip(7);
        const fileLayer = layers[layerIndex];
        const background = fileLayer?.layer.kind === "background";
        if (celType === 1) cels.set(layerIndex, { link: r.u16() });
        else if (celType === 0 || celType === 2) {
          const w = r.u16();
          const h = r.u16();
          const raw = celType === 2 ? inflate(r.bytesTo(end)) : r.bytesTo(end);
          cels.set(layerIndex, {
            x,
            y,
            w,
            h,
            opacity,
            rgba: toRgba(raw, w * h, background),
          });
        } else if (celType === 3) {
          const cols = r.u16();
          const rows = r.u16();
          const bits = r.u16();
          const idMask = r.u32();
          const xFlip = r.u32();
          const yFlip = r.u32();
          r.skip(4 + 10);
          const raw = inflate(r.bytesTo(end));
          const tileset =
            fileLayer?.tileset != null
              ? tilesets.get(fileLayer.tileset)
              : undefined;
          if (tileset) {
            const rgba = drawTilemap(
              raw,
              cols,
              rows,
              bits,
              { idMask, xFlip, yFlip },
              tileset,
            );
            cels.set(layerIndex, {
              x,
              y,
              w: cols * tileset.tileW,
              h: rows * tileset.tileH,
              opacity,
              rgba,
            });
          }
        }
      } else if (type === CHUNK.palette) {
        const size = r.u32();
        const from = r.u32();
        const to = r.u32();
        r.skip(8);
        if (!sawNewPalette) palette = [];
        sawNewPalette = true;
        palette.length = Math.max(palette.length, Math.min(size, 4096));
        for (let i = from; i <= to && i < 4096; i++) {
          const entry = r.u16();
          const color = [r.u8(), r.u8(), r.u8(), r.u8()];
          if (entry & 1) r.string();
          palette[i] = color;
        }
      } else if (type === CHUNK.oldPalette && !sawNewPalette) {
        const packets = r.u16();
        let index = 0;
        for (let p = 0; p < packets; p++) {
          index += r.u8();
          const count = r.u8() || 256;
          for (let i = 0; i < count; i++)
            palette[index++] = [r.u8(), r.u8(), r.u8(), 255];
        }
      } else if (type === CHUNK.tileset) {
        const id = r.u32();
        const tf = r.u32();
        const count = r.u32();
        const tileW = r.u16();
        const tileH = r.u16();
        r.skip(2 + 14);
        r.string();
        if (tf & 1) r.skip(8);
        if (tf & 2) {
          const length = r.u32();
          const raw = inflate(r.take(length));
          tilesets.set(id, {
            tileW,
            tileH,
            count,
            rgba: toRgba(raw, tileW * tileH * count, false),
          });
        }
      } else if (type === CHUNK.slice) {
        const keys = r.u32();
        const sf = r.u32();
        r.skip(4);
        const name = r.string().slice(0, 100);
        // A Pigxel slice is the same in every frame: the first key holds.
        for (let k = 0; k < keys; k++) {
          r.skip(4);
          const bounds = { x: r.i32(), y: r.i32(), w: r.u32(), h: r.u32() };
          const center =
            sf & 1 ? { x: r.i32(), y: r.i32(), w: r.u32(), h: r.u32() } : null;
          const pivot = sf & 2 ? { x: r.i32(), y: r.i32() } : null;
          if (k === 0 && name.trim() && bounds.w > 0 && bounds.h > 0)
            slices.push({
              id: crypto.randomUUID(),
              name,
              bounds,
              center,
              pivot,
            });
        }
      }
      r.pos = end;
    }
    r.pos = frameStart + frameBytes;
    if (r.pos > bytes.length) throw DAMAGED();
  }

  const tree = buildTree(layers);
  if (!pixelLayerIds(tree).length)
    throw new PigxelFileError("This Aseprite file has no layers to draw on.");
  const frames = durations.map((ms) => createFrame(clampDuration(ms)));
  const tileSize = width * height * 4;
  const cels: Cels = new Map(frames.map((frame) => [frame.id, new Map()]));
  fileCels.forEach((frameCels, f) => {
    for (const [index, stored] of frameCels) {
      // A linked cel shows another frame's image.
      const cel = "link" in stored ? fileCels[stored.link]?.get(index) : stored;
      const layer = layers[index]?.layer;
      if (!cel || "link" in cel || !layer || layer.kind === "group") continue;
      cels
        .get(frames[f]!.id)!
        .set(layer.id, placed(cel, width, height, tileSize));
    }
  });
  // The Background is opaque, so its empty cels show white, as in Aseprite.
  const hasBackground = tree[0]?.kind === "background";
  const colors = [
    ...new Set(
      palette
        .filter((c) => c && c[3]! > 0)
        .map(
          (c) =>
            "#" +
            c
              .slice(0, 3)
              .map((v) => v!.toString(16).padStart(2, "0"))
              .join(""),
        ),
    ),
  ].slice(0, MAX_PALETTE);
  return {
    id: crypto.randomUUID(),
    width,
    height,
    background: hasBackground ? "white" : "transparent",
    layers: tree,
    frames,
    cels,
    palette: colors.length ? colors : [...DEFAULT_PALETTE],
    slices,
  };
}

/** A cel's image on a full tile-sized RGBA, its opacity applied, clipped at the edges. */
function placed(
  cel: Extract<FileCel, { rgba: Uint8ClampedArray }>,
  width: number,
  height: number,
  tileSize: number,
) {
  const out = new Uint8ClampedArray(tileSize);
  for (let y = 0; y < cel.h; y++) {
    const ty = cel.y + y;
    if (ty < 0 || ty >= height) continue;
    for (let x = 0; x < cel.w; x++) {
      const tx = cel.x + x;
      if (tx < 0 || tx >= width) continue;
      const from = (y * cel.w + x) * 4;
      const to = (ty * width + tx) * 4;
      out[to] = cel.rgba[from]!;
      out[to + 1] = cel.rgba[from + 1]!;
      out[to + 2] = cel.rgba[from + 2]!;
      out[to + 3] = Math.round((cel.rgba[from + 3]! * cel.opacity) / 255);
    }
  }
  return out;
}

/** A tilemap cel drawn out as pixels: each tile copied (and flipped) from the tileset. */
function drawTilemap(
  raw: Uint8Array,
  cols: number,
  rows: number,
  bits: number,
  masks: { idMask: number; xFlip: number; yFlip: number },
  tileset: Tileset,
) {
  const { tileW, tileH, count } = tileset;
  const w = cols * tileW;
  const out = new Uint8ClampedArray(w * rows * tileH * 4);
  const bytes = bits / 8;
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  for (let t = 0; t < cols * rows; t++) {
    if ((t + 1) * bytes > raw.length) break;
    const value =
      bytes === 4
        ? view.getUint32(t * 4, true)
        : bytes === 2
          ? view.getUint16(t * 2, true)
          : raw[t]!;
    const id = value & masks.idMask;
    // Tile 0 is the empty one.
    if (!id || id >= count) continue;
    const flipX = (value & masks.xFlip) !== 0;
    const flipY = (value & masks.yFlip) !== 0;
    const left = (t % cols) * tileW;
    const top = Math.floor(t / cols) * tileH;
    for (let y = 0; y < tileH; y++)
      for (let x = 0; x < tileW; x++) {
        const sx = flipX ? tileW - 1 - x : x;
        const sy = flipY ? tileH - 1 - y : y;
        const from = ((id * tileH + sy) * tileW + sx) * 4;
        out.set(
          tileset.rgba.subarray(from, from + 4),
          ((top + y) * w + left + x) * 4,
        );
      }
  }
  return out;
}

/** The flat, bottom-to-top layer list (with child levels) as a tree. */
function buildTree(list: FileLayer[]): Layer[] {
  const top: Layer[] = [];
  // The children list of the group open at each level.
  const open: Layer[][] = [top];
  for (const { layer, level } of list) {
    const depth = Math.min(level, open.length - 1);
    open.length = depth + 1;
    // Only the very first top-level layer can be the Background.
    const fixed: Layer =
      layer.kind === "background" && (depth > 0 || top.length > 0)
        ? { ...layer, kind: "normal" }
        : layer;
    open[depth]!.push(fixed);
    if (fixed.kind === "group") open.push(fixed.children);
  }
  return top;
}

class Writer {
  private parts: Uint8Array[] = [];
  length = 0;
  private push(part: Uint8Array) {
    this.parts.push(part);
    this.length += part.length;
  }
  private num(size: number, set: (v: DataView) => void) {
    const part = new Uint8Array(size);
    set(new DataView(part.buffer));
    this.push(part);
  }
  u8(v: number) {
    this.push(new Uint8Array([v & 0xff]));
  }
  u16(v: number) {
    this.num(2, (d) => d.setUint16(0, v, true));
  }
  i16(v: number) {
    this.num(2, (d) => d.setInt16(0, v, true));
  }
  u32(v: number) {
    this.num(4, (d) => d.setUint32(0, v, true));
  }
  i32(v: number) {
    this.num(4, (d) => d.setInt32(0, v, true));
  }
  zeros(n: number) {
    this.push(new Uint8Array(n));
  }
  bytes(b: Uint8Array) {
    this.push(b);
  }
  string(s: string) {
    const b = new TextEncoder().encode(s);
    this.u16(b.length);
    this.push(b);
  }
  done() {
    const out = new Uint8Array(this.length);
    let at = 0;
    for (const p of this.parts) {
      out.set(p, at);
      at += p.length;
    }
    return out;
  }
}

/** A chunk: its size and type, then what `fill` writes. */
function chunk(type: number, fill: (w: Writer) => void) {
  const body = new Writer();
  fill(body);
  const data = body.done();
  const w = new Writer();
  w.u32(data.length + 6);
  w.u16(type);
  w.bytes(data);
  return w.done();
}

/** The box around a cel's drawn pixels, or null when it has none. */
function drawnBox(pixels: Uint8ClampedArray, width: number, height: number) {
  let [x0, y0, x1, y1] = [width, height, -1, -1];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (pixels[(y * width + x) * 4 + 3]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** The tile as a .aseprite file (RGBA): layers, frames, palette and slices. */
export function writeAseprite(doc: PigxelDocument): Uint8Array {
  const { width, height } = doc;
  // Layers bottom to top, each with how deep in groups it is.
  const flat: { layer: Layer; level: number }[] = [];
  const walk = (list: Layer[], level: number) => {
    for (const layer of list) {
      flat.push({ layer, level });
      if (layer.kind === "group") walk(layer.children, level + 1);
    }
  };
  walk(doc.layers, 0);

  const frameChunks = doc.frames.map((frame, f) => {
    const chunks: Uint8Array[] = [];
    if (f === 0) {
      for (const { layer, level } of flat) {
        chunks.push(
          chunk(CHUNK.layer, (w) => {
            w.u16(
              (layer.visible ? LAYER_FLAG.visible : 0) |
                (layer.locked ? 0 : LAYER_FLAG.editable) |
                (layer.kind === "background" ? LAYER_FLAG.background : 0) |
                (layer.kind === "group" && layer.collapsed
                  ? LAYER_FLAG.collapsed
                  : 0) |
                (layer.kind === "reference" ? LAYER_FLAG.reference : 0),
            );
            w.u16(layer.kind === "group" ? 1 : 0);
            w.u16(level);
            w.u16(0);
            w.u16(0);
            w.u16(
              Math.max(
                0,
                BLEND_MODES.findIndex((m) => m.id === layer.blend),
              ),
            );
            w.u8(layer.opacity);
            w.zeros(3);
            w.string(layer.name);
          }),
        );
      }
      if (doc.palette.length)
        chunks.push(
          chunk(CHUNK.palette, (w) => {
            w.u32(doc.palette.length);
            w.u32(0);
            w.u32(doc.palette.length - 1);
            w.zeros(8);
            for (const hex of doc.palette) {
              w.u16(0);
              for (const at of [1, 3, 5])
                w.u8(parseInt(hex.slice(at, at + 2), 16));
              w.u8(255);
            }
          }),
        );
      for (const slice of doc.slices)
        chunks.push(
          chunk(CHUNK.slice, (w) => {
            w.u32(1);
            w.u32((slice.center ? 1 : 0) | (slice.pivot ? 2 : 0));
            w.u32(0);
            w.string(slice.name);
            w.u32(0);
            w.i32(slice.bounds.x);
            w.i32(slice.bounds.y);
            w.u32(slice.bounds.w);
            w.u32(slice.bounds.h);
            if (slice.center) {
              w.i32(slice.center.x);
              w.i32(slice.center.y);
              w.u32(slice.center.w);
              w.u32(slice.center.h);
            }
            if (slice.pivot) {
              w.i32(slice.pivot.x);
              w.i32(slice.pivot.y);
            }
          }),
        );
    }
    flat.forEach(({ layer }, index) => {
      if (layer.kind === "group") return;
      const pixels = celOf(doc.cels, frame.id, layer.id);
      if (!pixels) return;
      // Only the drawn part is stored, as Aseprite does; the Background whole.
      const box =
        layer.kind === "background"
          ? { x: 0, y: 0, w: width, h: height }
          : drawnBox(pixels, width, height);
      if (!box) return;
      const raw = new Uint8Array(box.w * box.h * 4);
      for (let y = 0; y < box.h; y++) {
        const from = ((box.y + y) * width + box.x) * 4;
        raw.set(pixels.subarray(from, from + box.w * 4), y * box.w * 4);
      }
      chunks.push(
        chunk(CHUNK.cel, (w) => {
          w.u16(index);
          w.i16(box.x);
          w.i16(box.y);
          w.u8(255);
          w.u16(2);
          w.i16(0);
          w.zeros(5);
          w.u16(box.w);
          w.u16(box.h);
          w.bytes(zlibSync(raw));
        }),
      );
    });
    const body = new Writer();
    const size = chunks.reduce((sum, c) => sum + c.length, 0);
    body.u32(FRAME_HEADER_SIZE + size);
    body.u16(FRAME_MAGIC);
    body.u16(Math.min(chunks.length, 0xffff));
    body.u16(Math.min(frame.duration, 0xffff));
    body.zeros(2);
    body.u32(chunks.length);
    for (const c of chunks) body.bytes(c);
    return body.done();
  });

  const framesSize = frameChunks.reduce((sum, f) => sum + f.length, 0);
  const file = new Writer();
  file.u32(HEADER_SIZE + framesSize);
  file.u16(HEADER_MAGIC);
  file.u16(doc.frames.length);
  file.u16(width);
  file.u16(height);
  file.u16(32);
  file.u32(OPACITY_VALID | GROUP_BLEND_VALID);
  file.u16(Math.min(doc.frames[0]?.duration ?? DEFAULT_FRAME_DURATION, 0xffff));
  file.zeros(8);
  file.u8(0);
  file.zeros(3);
  file.u16(doc.palette.length);
  file.u8(1);
  file.u8(1);
  file.i16(0);
  file.i16(0);
  file.u16(16);
  file.u16(16);
  file.zeros(84);
  for (const f of frameChunks) file.bytes(f);
  return file.done();
}
