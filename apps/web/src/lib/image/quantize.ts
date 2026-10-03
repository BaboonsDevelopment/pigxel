export type RGB = { r: number; g: number; b: number };

const MAX_COLORS = 62;

type QuantizeOpts = {
  colors?: number;
  bgTolerance?: number;
  bgRounds?: number;
  keepBackground?: boolean;
  fit?: "contain" | "stretch";
  detail?: "sharp" | "smooth";
};

type Quantized = {
  buf: Uint8ClampedArray;
  palette: string[];
  removed: number;
};

const px = (buf: Uint8ClampedArray, i: number) => buf[i] ?? 0;

const hex = (c: RGB) =>
  `#${[c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;

function downscale(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(dw * dh * 4);

  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor((y * sh) / dh);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor((x * sw) / dw);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / dw));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let weight = 0;
      let n = 0;

      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * sw + sx) * 4;
          const alpha = px(src, i + 3) / 255;
          r += px(src, i) * alpha;
          g += px(src, i + 1) * alpha;
          b += px(src, i + 2) * alpha;
          a += px(src, i + 3);
          weight += alpha;
          n++;
        }
      }

      const di = (y * dw + x) * 4;
      if (weight > 0) {
        out[di] = r / weight;
        out[di + 1] = g / weight;
        out[di + 2] = b / weight;
      }
      out[di + 3] = n > 0 && a / n >= 102 ? 255 : 0;
    }
  }

  return out;
}

const dist2 = (a: RGB, b: RGB) =>
  (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;

const wdist2 = (a: RGB, b: RGB) =>
  0.3 * (a.r - b.r) ** 2 + 0.59 * (a.g - b.g) ** 2 + 0.11 * (a.b - b.b) ** 2;

const luma = (c: RGB) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

export function nearestIndex(c: RGB, palette: RGB[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = wdist2(c, palette[i]!);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function keyOut(
  buf: Uint8ClampedArray,
  w: number,
  h: number,
  sx: number,
  sy: number,
  tol2: number,
): number {
  const si = (sy * w + sx) * 4;
  if (px(buf, si + 3) === 0) return 0;
  const seed: RGB = { r: px(buf, si), g: px(buf, si + 1), b: px(buf, si + 2) };

  let removed = 0;
  const stack: Array<[number, number]> = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = (y * w + x) * 4;
    if (px(buf, i + 3) === 0) continue;
    if (
      dist2({ r: px(buf, i), g: px(buf, i + 1), b: px(buf, i + 2) }, seed) >
      tol2
    )
      continue;

    buf[i] = 0;
    buf[i + 1] = 0;
    buf[i + 2] = 0;
    buf[i + 3] = 0;
    removed++;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return removed;
}

function removeBackground(
  buf: Uint8ClampedArray,
  w: number,
  h: number,
  tolerance = 40,
  rounds = 3,
): number {
  const tol2 = tolerance * tolerance;
  let removed = 0;

  for (let round = 0; round < rounds; round++) {
    let inRound = 0;
    for (let x = 0; x < w; x++) {
      inRound += keyOut(buf, w, h, x, 0, tol2);
      inRound += keyOut(buf, w, h, x, h - 1, tol2);
    }
    for (let y = 0; y < h; y++) {
      inRound += keyOut(buf, w, h, 0, y, tol2);
      inRound += keyOut(buf, w, h, w - 1, y, tol2);
    }
    removed += inRound;
    if (inRound === 0) break;
  }

  return removed;
}

export type Bucket = { r: number; g: number; b: number; n: number };

export function medianCut(buckets: Bucket[], max: number): RGB[] {
  if (buckets.length === 0) return [];
  let boxes: Bucket[][] = [buckets];

  while (boxes.length < max) {
    let target = -1;
    let bestScore = 0;

    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      const span = channelSpan(box);
      const weight = box.reduce((s, c) => s + c.n, 0);
      const score = span.range * Math.log2(weight + 1);
      if (score > bestScore) {
        bestScore = score;
        target = i;
      }
    });

    if (target === -1) break;

    const box = boxes[target]!;
    const { channel } = channelSpan(box);
    const sorted = [...box].sort((a, b) => a[channel] - b[channel]);

    const total = sorted.reduce((s, c) => s + c.n, 0);
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      acc += sorted[i]!.n;
      if (acc >= total / 2) {
        cut = i + 1;
        break;
      }
    }

    boxes = [
      ...boxes.slice(0, target),
      sorted.slice(0, cut),
      sorted.slice(cut),
      ...boxes.slice(target + 1),
    ];
  }

  return boxes.filter((b) => b.length > 0).map(average);
}

function channelSpan(box: Bucket[]): {
  channel: "r" | "g" | "b";
  range: number;
} {
  let best: { channel: "r" | "g" | "b"; range: number } = {
    channel: "r",
    range: -1,
  };
  for (const channel of ["r", "g", "b"] as const) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of box) {
      if (c[channel] < lo) lo = c[channel];
      if (c[channel] > hi) hi = c[channel];
    }
    const range = hi - lo;
    if (range > best.range) best = { channel, range };
  }
  return best;
}

function average(box: Bucket[]): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const c of box) {
    r += c.r * c.n;
    g += c.g * c.n;
    b += c.b * c.n;
    n += c.n;
  }
  return { r: r / n, g: g / n, b: b / n };
}

const BIN = (r: number, g: number, b: number) =>
  ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

type Accum = { r: number; g: number; b: number; n: number };

function histogram(
  buf: Uint8ClampedArray,
  w: number,
  h: number,
): Map<number, Accum> {
  const bins = new Map<number, Accum>();
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    if (px(buf, p + 3) < 128) continue;
    const key = BIN(px(buf, p), px(buf, p + 1), px(buf, p + 2));
    const a = bins.get(key);
    if (a) {
      a.r += px(buf, p);
      a.g += px(buf, p + 1);
      a.b += px(buf, p + 2);
      a.n++;
    } else {
      bins.set(key, {
        r: px(buf, p),
        g: px(buf, p + 1),
        b: px(buf, p + 2),
        n: 1,
      });
    }
  }
  return bins;
}

function buildPalette(bins: Map<number, Accum>, maxColors: number): RGB[] {
  const buckets: Bucket[] = [...bins.values()].map((a) => ({
    r: a.r / a.n,
    g: a.g / a.n,
    b: a.b / a.n,
    n: a.n,
  }));
  if (buckets.length === 0) return [];
  if (buckets.length <= maxColors)
    return buckets.map((b) => ({ r: b.r, g: b.g, b: b.b }));

  const total = buckets.reduce((s, b) => s + b.n, 0);
  const notable = buckets.filter((b) => b.n >= Math.max(2, total * 0.001));
  const ranked = (notable.length ? notable : buckets)
    .slice()
    .sort((a, b) => luma(a) - luma(b));

  const wanted: RGB[] = [ranked[0]!, ranked[ranked.length - 1]!].map((c) => ({
    r: c.r,
    g: c.g,
    b: c.b,
  }));

  const core = medianCut(buckets, maxColors);
  const missing = wanted.filter(
    (c) => wdist2(c, core[nearestIndex(c, core)]!) > 900,
  );
  if (missing.length === 0) return core;

  return [
    ...medianCut(buckets, Math.max(1, maxColors - missing.length)),
    ...missing,
  ];
}

export function imageToSprite(
  rgba: Uint8ClampedArray,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  opts: QuantizeOpts = {},
): Quantized {
  let source = rgba;
  let removed = 0;

  if (!opts.keepBackground) {
    let transparent = 0;
    for (let i = 0; i < sw * sh; i++)
      if (px(rgba, i * 4 + 3) < 128) transparent++;
    if (transparent <= sw * sh * 0.05) {
      source = new Uint8ClampedArray(rgba);
      removed = removeBackground(
        source,
        sw,
        sh,
        opts.bgTolerance ?? 40,
        opts.bgRounds ?? 3,
      );
    }
  }

  let tw = dw;
  let th = dh;
  if ((opts.fit ?? "contain") === "contain") {
    const k = Math.min(dw / sw, dh / sh);
    tw = Math.max(1, Math.min(dw, Math.round(sw * k)));
    th = Math.max(1, Math.min(dh, Math.round(sh * k)));
  }

  const place = (small: Uint8ClampedArray, palette: string[]): Quantized => {
    if (tw === dw && th === dh) return { buf: small, palette, removed };
    const buf = new Uint8ClampedArray(dw * dh * 4);
    const ox = Math.floor((dw - tw) / 2);
    const oy = Math.floor((dh - th) / 2);
    for (let y = 0; y < th; y++) {
      const from = y * tw * 4;
      buf.set(small.subarray(from, from + tw * 4), ((y + oy) * dw + ox) * 4);
    }
    return { buf, palette, removed };
  };

  const bins = histogram(source, sw, sh);
  const palette = buildPalette(
    bins,
    Math.max(2, Math.min(opts.colors ?? MAX_COLORS, MAX_COLORS)),
  );
  if (palette.length === 0) {
    return { buf: new Uint8ClampedArray(dw * dh * 4), palette: [], removed };
  }
  const hexes = palette.map(hex);

  if (opts.detail === "smooth") {
    const small = downscale(source, sw, sh, tw, th);
    for (let i = 0; i < tw * th; i++) {
      const p = i * 4;
      if (px(small, p + 3) < 128) {
        small[p] = small[p + 1] = small[p + 2] = small[p + 3] = 0;
        continue;
      }
      const c =
        palette[
          nearestIndex(
            { r: px(small, p), g: px(small, p + 1), b: px(small, p + 2) },
            palette,
          )
        ]!;
      small[p] = Math.round(c.r);
      small[p + 1] = Math.round(c.g);
      small[p + 2] = Math.round(c.b);
      small[p + 3] = 255;
    }
    return place(small, hexes);
  }

  const lut = new Map<number, number>();
  for (const [key, a] of bins) {
    lut.set(
      key,
      nearestIndex({ r: a.r / a.n, g: a.g / a.n, b: a.b / a.n }, palette),
    );
  }

  const small = new Uint8ClampedArray(tw * th * 4);
  const counts = new Int32Array(palette.length);

  for (let y = 0; y < th; y++) {
    const y0 = Math.floor((y * sh) / th);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * sh) / th));
    for (let x = 0; x < tw; x++) {
      const x0 = Math.floor((x * sw) / tw);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * sw) / tw));

      counts.fill(0);
      let opaque = 0;
      let total = 0;

      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          total++;
          const p = (sy * sw + sx) * 4;
          if (px(source, p + 3) < 128) continue;
          opaque++;
          const bin =
            lut.get(BIN(px(source, p), px(source, p + 1), px(source, p + 2))) ??
            0;
          counts[bin]! += 1;
        }
      }

      if (total === 0 || opaque / total < 0.4) continue;

      let best = 0;
      for (let i = 1; i < counts.length; i++)
        if (counts[i]! > counts[best]!) best = i;

      const c = palette[best]!;
      const di = (y * tw + x) * 4;
      small[di] = Math.round(c.r);
      small[di + 1] = Math.round(c.g);
      small[di + 2] = Math.round(c.b);
      small[di + 3] = 255;
    }
  }

  return place(small, hexes);
}
