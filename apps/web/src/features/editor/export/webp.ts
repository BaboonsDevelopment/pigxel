type AnimatedFrame = { rgba: Uint8ClampedArray; duration: number };

const CODE_LENGTH_ORDER = [
  17, 18, 0, 1, 2, 3, 4, 5, 16, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];
const GREEN_SYMBOLS = 256 + 24;
const DISTANCE_SYMBOLS = 40;
const MAX_LENGTH = 15;
const MAX_CODE_LENGTH_LENGTH = 7;
const MAX_DURATION = 0xffffff;

class BitWriter {
  private bytes: number[] = [];
  private bits = 0;
  private count = 0;

  write(value: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.bits |= ((value >>> i) & 1) << this.count;
      if (++this.count === 8) {
        this.bytes.push(this.bits);
        this.bits = 0;
        this.count = 0;
      }
    }
  }

  done() {
    if (this.count) this.bytes.push(this.bits);
    return new Uint8Array(this.bytes);
  }
}

function huffmanLengths(freqs: number[], limit: number): number[] {
  let counts = freqs.slice();
  for (;;) {
    const used = counts.flatMap((f, symbol) => (f ? [symbol] : []));
    const lengths = new Array<number>(freqs.length).fill(0);
    if (used.length === 1) {
      lengths[used[0]!] = 1;
      return lengths;
    }
    type Node = { weight: number; symbols: number[] };
    let nodes: Node[] = used.map((s) => ({ weight: counts[s]!, symbols: [s] }));
    while (nodes.length > 1) {
      nodes.sort((a, b) => a.weight - b.weight);
      const [a, b] = nodes.splice(0, 2) as [Node, Node];
      for (const s of [...a.symbols, ...b.symbols]) lengths[s]!++;
      nodes = [
        ...nodes,
        { weight: a.weight + b.weight, symbols: [...a.symbols, ...b.symbols] },
      ];
    }
    if (Math.max(...lengths) <= limit) return lengths;
    counts = counts.map((f) => (f ? (f >> 1) + 1 : 0));
  }
}

function canonicalCodes(lengths: number[]): number[] {
  const codes = new Array<number>(lengths.length).fill(0);
  const used = lengths.filter(Boolean).length;
  if (used < 2) return codes;
  const perLength = new Array<number>(MAX_LENGTH + 2).fill(0);
  for (const len of lengths) if (len) perLength[len]!++;
  const next = new Array<number>(MAX_LENGTH + 2).fill(0);
  let code = 0;
  for (let len = 1; len <= MAX_LENGTH + 1; len++) {
    code = (code + perLength[len - 1]!) << 1;
    next[len] = code;
  }
  lengths.forEach((len, symbol) => {
    if (!len) return;
    let value = next[len]!++;
    let reversed = 0;
    for (let i = 0; i < len; i++) {
      reversed = (reversed << 1) | (value & 1);
      value >>= 1;
    }
    codes[symbol] = reversed;
  });
  return codes;
}

type Code = { lengths: number[]; codes: number[] };

function writeCode(out: BitWriter, freqs: number[]): Code {
  const used = freqs.flatMap((f, symbol) => (f ? [symbol] : []));
  const lengths = new Array<number>(freqs.length).fill(0);
  const codes = new Array<number>(freqs.length).fill(0);
  if (used.length <= 2 && used.every((s) => s < 256)) {
    const [first = 0, second] = used;
    out.write(1, 1);
    out.write(used.length === 2 ? 1 : 0, 1);
    const wide = first > 1;
    out.write(wide ? 1 : 0, 1);
    out.write(first, wide ? 8 : 1);
    if (second !== undefined) {
      out.write(second, 8);
      lengths[first] = 1;
      lengths[second] = 1;
      codes[second] = 1;
    }
    return { lengths, codes };
  }
  const own = huffmanLengths(freqs, MAX_LENGTH);
  const lengthFreqs = new Array<number>(19).fill(0);
  for (const len of own) lengthFreqs[len]!++;
  const lengthLengths = huffmanLengths(lengthFreqs, MAX_CODE_LENGTH_LENGTH);
  const lengthCodes = canonicalCodes(lengthLengths);
  const single = lengthLengths.filter(Boolean).length === 1;
  out.write(0, 1);
  out.write(19 - 4, 4);
  for (const symbol of CODE_LENGTH_ORDER) out.write(lengthLengths[symbol]!, 3);
  out.write(0, 1);
  for (const len of own)
    if (!single) out.write(lengthCodes[len]!, lengthLengths[len]!);
  return { lengths: own, codes: canonicalCodes(own) };
}

function encodeLossless(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const out = new BitWriter();
  out.write(0x2f, 8);
  out.write(width - 1, 14);
  out.write(height - 1, 14);
  let alpha = false;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i]! < 255) alpha = true;
  out.write(alpha ? 1 : 0, 1);
  out.write(0, 3);
  out.write(0, 1);
  out.write(0, 1);
  out.write(0, 1);
  const green = new Array<number>(GREEN_SYMBOLS).fill(0);
  const red = new Array<number>(256).fill(0);
  const blue = new Array<number>(256).fill(0);
  const alphas = new Array<number>(256).fill(0);
  for (let i = 0; i < rgba.length; i += 4) {
    red[rgba[i]!]!++;
    green[rgba[i + 1]!]!++;
    blue[rgba[i + 2]!]!++;
    alphas[rgba[i + 3]!]!++;
  }
  const codes = [green, red, blue, alphas].map((freqs) =>
    writeCode(out, freqs),
  );
  writeCode(out, new Array<number>(DISTANCE_SYMBOLS).fill(0));
  const [g, r, b, a] = codes as [Code, Code, Code, Code];
  for (let i = 0; i < rgba.length; i += 4) {
    out.write(g.codes[rgba[i + 1]!]!, g.lengths[rgba[i + 1]!]!);
    out.write(r.codes[rgba[i]!]!, r.lengths[rgba[i]!]!);
    out.write(b.codes[rgba[i + 2]!]!, b.lengths[rgba[i + 2]!]!);
    out.write(a.codes[rgba[i + 3]!]!, a.lengths[rgba[i + 3]!]!);
  }
  return out.done();
}

const fourCC = (text: string) => [...text].map((c) => c.charCodeAt(0));
const le = (value: number, bytes: number) =>
  Array.from({ length: bytes }, (_, i) => (value >>> (8 * i)) & 0xff);

function chunk(type: string, data: ArrayLike<number>): number[] {
  const out = [...fourCC(type), ...le(data.length, 4)];
  for (let i = 0; i < data.length; i++) out.push(data[i]!);
  if (data.length % 2) out.push(0);
  return out;
}

export function encodeWebp(
  frames: AnimatedFrame[],
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  const body = [
    ...fourCC("WEBP"),
    ...chunk("VP8X", [
      0x12,
      0,
      0,
      0,
      ...le(width - 1, 3),
      ...le(height - 1, 3),
    ]),
    ...chunk("ANIM", [0, 0, 0, 0, ...le(0, 2)]),
  ];
  for (const frame of frames) {
    const image = chunk("VP8L", encodeLossless(frame.rgba, width, height));
    const head = [
      ...le(0, 3),
      ...le(0, 3),
      ...le(width - 1, 3),
      ...le(height - 1, 3),
      ...le(Math.min(MAX_DURATION, Math.max(1, Math.round(frame.duration))), 3),
      0x02,
    ];
    const anmf = chunk("ANMF", [...head, ...image]);
    for (const byte of anmf) body.push(byte);
  }
  return new Uint8Array([...fourCC("RIFF"), ...le(body.length, 4), ...body]);
}
