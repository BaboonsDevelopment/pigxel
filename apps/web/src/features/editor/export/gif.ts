import {
  medianCut,
  nearestIndex,
  type Bucket,
  type RGB,
} from "@/lib/image/quantize";
import { GIF_ALPHA_CUTOFF, GIF_MAX_COLORS, GIF_MIN_DELAY } from "./constants";

type GifFrame = { rgba: Uint8ClampedArray; duration: number };

type IndexedFrames = {
  palette: RGB[];
  transparent: number | null;
  frames: Uint8Array[];
};

const keyOf = (rgba: Uint8ClampedArray, p: number) =>
  (rgba[p]! << 16) | (rgba[p + 1]! << 8) | rgba[p + 2]!;

export function toIndexed(frames: Uint8ClampedArray[]): IndexedFrames {
  const counts = new Map<number, number>();
  let hasTransparent = false;
  for (const rgba of frames)
    for (let p = 0; p < rgba.length; p += 4) {
      if (rgba[p + 3]! < GIF_ALPHA_CUTOFF) {
        hasTransparent = true;
        continue;
      }
      const key = keyOf(rgba, p);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

  const buckets: Bucket[] = [...counts].map(([key, n]) => ({
    r: key >> 16,
    g: (key >> 8) & 0xff,
    b: key & 0xff,
    n,
  }));
  const palette =
    buckets.length <= GIF_MAX_COLORS
      ? buckets.map(({ r, g, b }) => ({ r, g, b }))
      : medianCut(buckets, GIF_MAX_COLORS).map(({ r, g, b }) => ({
          r: Math.round(r),
          g: Math.round(g),
          b: Math.round(b),
        }));

  const indexOf = new Map<number, number>();
  for (const key of counts.keys())
    indexOf.set(
      key,
      nearestIndex(
        { r: key >> 16, g: (key >> 8) & 0xff, b: key & 0xff },
        palette,
      ),
    );
  const transparent = hasTransparent || !palette.length ? palette.length : null;

  return {
    palette,
    transparent,
    frames: frames.map((rgba) => {
      const out = new Uint8Array(rgba.length / 4);
      for (let i = 0; i < out.length; i++) {
        const p = i * 4;
        out[i] =
          rgba[p + 3]! < GIF_ALPHA_CUTOFF
            ? transparent!
            : indexOf.get(keyOf(rgba, p))!;
      }
      return out;
    }),
  };
}

class Bytes {
  private data = new Uint8Array(1024);
  length = 0;

  byte(value: number) {
    if (this.length === this.data.length) {
      const grown = new Uint8Array(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    this.data[this.length++] = value;
  }

  word(value: number) {
    this.byte(value & 0xff);
    this.byte((value >> 8) & 0xff);
  }

  text(value: string) {
    for (const char of value) this.byte(char.charCodeAt(0));
  }

  result() {
    return this.data.slice(0, this.length);
  }
}

const MAX_CODE_BITS = 12;

function writeLzw(out: Bytes, indices: Uint8Array, minCodeSize: number) {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let codeSize = minCodeSize + 1;
  let next = end + 1;
  let table = new Map<number, number>();

  const block: number[] = [];
  let bits = 0;
  let bitCount = 0;
  const flushBlock = () => {
    out.byte(block.length);
    for (const b of block) out.byte(b);
    block.length = 0;
  };
  const emit = (code: number) => {
    bits |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      block.push(bits & 0xff);
      if (block.length === 255) flushBlock();
      bits >>= 8;
      bitCount -= 8;
    }
  };

  out.byte(minCodeSize);
  emit(clear);
  let prefix = indices[0]!;
  for (let i = 1; i < indices.length; i++) {
    const index = indices[i]!;
    const key = (prefix << 8) | index;
    const found = table.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    if (next === 1 << MAX_CODE_BITS) {
      emit(clear);
      table = new Map();
      codeSize = minCodeSize + 1;
      next = end + 1;
    } else {
      if (next >= 1 << codeSize) codeSize++;
      table.set(key, next++);
    }
    prefix = index;
  }
  emit(prefix);
  emit(end);
  if (bitCount > 0) block.push(bits & 0xff);
  if (block.length) flushBlock();
  out.byte(0);
}

export function encodeGif(
  frames: GifFrame[],
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  const indexed = toIndexed(frames.map((f) => f.rgba));
  const colors =
    indexed.palette.length + (indexed.transparent === null ? 0 : 1);
  let depth = 1;
  while (1 << depth < colors) depth++;

  const out = new Bytes();
  out.text("GIF89a");
  out.word(width);
  out.word(height);
  out.byte(0x80 | ((depth - 1) << 4) | (depth - 1));
  out.byte(0);
  out.byte(0);
  for (let i = 0; i < 1 << depth; i++) {
    const c = indexed.palette[i];
    out.byte(c?.r ?? 0);
    out.byte(c?.g ?? 0);
    out.byte(c?.b ?? 0);
  }

  out.byte(0x21);
  out.byte(0xff);
  out.byte(11);
  out.text("NETSCAPE2.0");
  out.byte(3);
  out.byte(1);
  out.word(0);
  out.byte(0);

  frames.forEach((frame, n) => {
    out.byte(0x21);
    out.byte(0xf9);
    out.byte(4);
    out.byte((2 << 2) | (indexed.transparent === null ? 0 : 1));
    out.word(Math.max(GIF_MIN_DELAY, Math.round(frame.duration / 10)));
    out.byte(indexed.transparent ?? 0);
    out.byte(0);

    out.byte(0x2c);
    out.word(0);
    out.word(0);
    out.word(width);
    out.word(height);
    out.byte(0);
    writeLzw(out, indexed.frames[n]!, Math.max(2, depth));
  });

  out.byte(0x3b);
  return out.result();
}
