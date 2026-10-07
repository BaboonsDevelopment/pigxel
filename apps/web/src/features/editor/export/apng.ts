import { zlibSync } from "fflate";

type AnimatedFrame = { rgba: Uint8ClampedArray; duration: number };

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

class Bytes {
  private parts: number[] = [];
  u8(v: number) {
    this.parts.push(v & 0xff);
    return this;
  }
  u16(v: number) {
    return this.u8(v >>> 8).u8(v);
  }
  u32(v: number) {
    return this.u16(v >>> 16).u16(v);
  }
  raw(bytes: ArrayLike<number>) {
    for (let i = 0; i < bytes.length; i++) this.parts.push(bytes[i]!);
    return this;
  }
  done() {
    return new Uint8Array(this.parts);
  }
}

function chunk(out: Uint8Array[], type: string, data: Uint8Array) {
  const head = new Bytes().u32(data.length).done();
  const body = new Uint8Array(4 + data.length);
  body.set([...type].map((c) => c.charCodeAt(0)));
  body.set(data, 4);
  out.push(head, body, new Bytes().u32(crc32(body)).done());
}

function compressed(rgba: Uint8ClampedArray, width: number, height: number) {
  const rows = new Uint8Array(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)
    rows.set(
      rgba.subarray(y * width * 4, (y + 1) * width * 4),
      y * (width * 4 + 1) + 1,
    );
  return zlibSync(rows, { level: 9 });
}

function joined(out: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = out.reduce((sum, part) => sum + part.length, 0);
  const file = new Uint8Array(total);
  let at = 0;
  for (const part of out) {
    file.set(part, at);
    at += part.length;
  }
  return file;
}

const header = (width: number, height: number) =>
  new Bytes().u32(width).u32(height).u8(8).u8(6).u8(0).u8(0).u8(0).done();

export function encodePng(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  const out: Uint8Array[] = [new Uint8Array(SIGNATURE)];
  chunk(out, "IHDR", header(width, height));
  chunk(out, "IDAT", compressed(rgba, width, height));
  chunk(out, "IEND", new Uint8Array());
  return joined(out);
}

export function encodeApng(
  frames: AnimatedFrame[],
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  const out: Uint8Array[] = [new Uint8Array(SIGNATURE)];
  chunk(out, "IHDR", header(width, height));
  chunk(out, "acTL", new Bytes().u32(frames.length).u32(0).done());
  let sequence = 0;
  frames.forEach((frame, n) => {
    chunk(
      out,
      "fcTL",
      new Bytes()
        .u32(sequence++)
        .u32(width)
        .u32(height)
        .u32(0)
        .u32(0)
        .u16(Math.min(65535, Math.max(1, Math.round(frame.duration))))
        .u16(1000)
        .u8(0)
        .u8(0)
        .done(),
    );
    const data = compressed(frame.rgba, width, height);
    if (n === 0) chunk(out, "IDAT", data);
    else chunk(out, "fdAT", new Bytes().u32(sequence++).raw(data).done());
  });
  chunk(out, "IEND", new Uint8Array());
  return joined(out);
}
