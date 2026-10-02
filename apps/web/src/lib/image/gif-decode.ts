/** One picture of an animation: the whole frame as RGBA, and how long it shows. */
export type DecodedFrame = { rgba: Uint8ClampedArray; duration: number };

export type DecodedAnimation = { w: number; h: number; frames: DecodedFrame[] };

/** What browsers show a frame for when the file asks for less than 20 ms. */
const SHORT_DELAY_MS = 100;

/**
 * Reads every frame of a GIF, each drawn over the ones before as the file
 * says (its disposal method), so each is the full picture a viewer shows.
 * Throws on a file that isn't a GIF.
 */
export function decodeGif(bytes: Uint8Array): DecodedAnimation {
  let pos = 0;
  const u8 = () => {
    if (pos >= bytes.length) throw new Error("The GIF ends too early.");
    return bytes[pos++]!;
  };
  const u16 = () => u8() | (u8() << 8);
  const colorTable = (size: number) => {
    const table = bytes.subarray(pos, pos + size * 3);
    pos += size * 3;
    return table;
  };
  const subBlocks = () => {
    const parts: Uint8Array[] = [];
    for (let n = u8(); n; n = u8()) {
      parts.push(bytes.subarray(pos, pos + n));
      pos += n;
    }
    const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
    let at = 0;
    for (const p of parts) {
      out.set(p, at);
      at += p.length;
    }
    return out;
  };

  const signature = String.fromCharCode(...bytes.subarray(0, 6));
  if (signature !== "GIF87a" && signature !== "GIF89a")
    throw new Error("This isn’t a GIF.");
  pos = 6;
  const w = u16();
  const h = u16();
  const packed = u8();
  pos += 2; // background colour, pixel aspect ratio
  const global = packed & 0x80 ? colorTable(2 << (packed & 7)) : null;

  const screen = new Uint8ClampedArray(w * h * 4);
  const frames: DecodedFrame[] = [];
  let delay = 0;
  let transparent = -1;
  let disposal = 0;

  for (;;) {
    const kind = u8();
    if (kind === 0x3b) break;
    if (kind === 0x21) {
      const label = u8();
      if (label === 0xf9) {
        u8(); // block size
        const flags = u8();
        delay = u16();
        const index = u8();
        u8(); // terminator
        disposal = (flags >> 2) & 7;
        transparent = flags & 1 ? index : -1;
      } else subBlocks();
      continue;
    }
    if (kind !== 0x2c) throw new Error("This GIF is damaged.");

    const left = u16();
    const top = u16();
    const fw = u16();
    const fh = u16();
    const flags = u8();
    const local = flags & 0x80 ? colorTable(2 << (flags & 7)) : null;
    const interlaced = (flags & 0x40) !== 0;
    const table = local ?? global;
    const minCode = u8();
    const indices = lzw(subBlocks(), minCode, fw * fh);

    // "Restore to previous" puts back what was there before this frame.
    const previous = disposal === 3 ? new Uint8ClampedArray(screen) : null;
    const rows = interlaced ? interlacedRows(fh) : null;
    for (let i = 0; i < fw * fh; i++) {
      const index = indices[i]!;
      if (index === transparent || !table || index * 3 + 2 >= table.length)
        continue;
      const y = top + (rows ? rows[Math.floor(i / fw)]! : Math.floor(i / fw));
      const x = left + (i % fw);
      if (x >= w || y >= h) continue;
      const at = (y * w + x) * 4;
      screen[at] = table[index * 3]!;
      screen[at + 1] = table[index * 3 + 1]!;
      screen[at + 2] = table[index * 3 + 2]!;
      screen[at + 3] = 255;
    }
    frames.push({
      rgba: new Uint8ClampedArray(screen),
      duration: delay < 2 ? SHORT_DELAY_MS : delay * 10,
    });

    if (disposal === 2)
      for (let y = top; y < Math.min(h, top + fh); y++)
        screen.fill(
          0,
          (y * w + left) * 4,
          (y * w + Math.min(w, left + fw)) * 4,
        );
    else if (previous) screen.set(previous);
    delay = 0;
    transparent = -1;
    disposal = 0;
  }
  if (!frames.length) throw new Error("This GIF has no pictures.");
  return { w, h, frames };
}

/** Which picture row each stored row of an interlaced GIF is. */
function interlacedRows(h: number) {
  const rows: number[] = [];
  for (const [start, step] of [
    [0, 8],
    [4, 8],
    [2, 4],
    [1, 2],
  ] as const)
    for (let y = start; y < h; y += step) rows.push(y);
  return rows;
}

/** GIF's variable-width LZW: the colour index of each pixel, `count` of them. */
function lzw(data: Uint8Array, minCode: number, count: number): Uint8Array {
  const out = new Uint8Array(count);
  const clear = 1 << minCode;
  const end = clear + 1;
  const prefix = new Int16Array(4096);
  const suffix = new Uint8Array(4096);
  const length = new Uint16Array(4096);
  for (let i = 0; i < clear; i++) {
    suffix[i] = i;
    length[i] = 1;
  }
  let size = minCode + 1;
  let next = clear + 2;
  let prev = -1;
  let written = 0;
  let bit = 0;
  const total = data.length * 8;

  while (bit + size <= total && written < count) {
    let code = 0;
    for (let i = 0; i < size; i++, bit++)
      code |= ((data[bit >> 3]! >> (bit & 7)) & 1) << i;
    if (code === clear) {
      size = minCode + 1;
      next = clear + 2;
      prev = -1;
      continue;
    }
    if (code === end) break;
    // A code not in the table yet is the previous string plus its own first byte.
    const known = code < next;
    const entry = known ? code : prev;
    if (entry < 0) break;
    const len = length[entry]!;
    const start = written;
    for (let c = entry, i = len - 1; i >= 0; c = prefix[c]!, i--)
      if (start + i < count) out[start + i] = suffix[c]!;
    written += len;
    const first = out[start]!;
    if (!known) {
      if (written < count) out[written] = first;
      written++;
    }
    // Each code after the first adds the previous string plus this one's first byte.
    if (prev >= 0 && next < 4096) {
      prefix[next] = prev;
      suffix[next] = first;
      length[next] = length[prev]! + 1;
      next++;
      if (next === 1 << size && size < 12) size++;
    }
    prev = code;
  }
  return out;
}
