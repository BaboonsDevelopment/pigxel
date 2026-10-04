import {
  medianCut,
  nearestIndex,
  type Bucket,
  type RGB,
} from "@/lib/image/quantize";

export type ReduceDither = "none" | "ordered" | "diffusion";

export const REDUCE_DITHERS: { value: ReduceDither; label: string }[] = [
  { value: "none", label: "None" },
  { value: "ordered", label: "Ordered (Bayer)" },
  { value: "diffusion", label: "Error diffusion" },
];

export const MIN_REDUCE = 2;
export const MAX_REDUCE = 256;

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const toHex = (c: RGB) =>
  `#${[c.r, c.g, c.b]
    .map((n) =>
      Math.min(255, Math.max(0, Math.round(n)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const fromHex = (hex: string): RGB => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
});

export function countColors(pictures: Uint8ClampedArray[]): number {
  const seen = new Set<number>();
  for (const rgba of pictures)
    for (let i = 0; i < rgba.length; i += 4)
      if (rgba[i + 3])
        seen.add((rgba[i]! << 16) | (rgba[i + 1]! << 8) | rgba[i + 2]!);
  return seen.size;
}

export function reducedPalette(
  pictures: Uint8ClampedArray[],
  count: number,
): string[] {
  const counts = new Map<number, number>();
  for (const rgba of pictures)
    for (let i = 0; i < rgba.length; i += 4) {
      if (!rgba[i + 3]) continue;
      const key = (rgba[i]! << 16) | (rgba[i + 1]! << 8) | rgba[i + 2]!;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  const buckets: Bucket[] = [...counts].map(([key, n]) => ({
    r: (key >> 16) & 255,
    g: (key >> 8) & 255,
    b: key & 255,
    n,
  }));
  return [...new Set(medianCut(buckets, count).map(toHex))];
}

export function mapToPalette(
  rgba: Uint8ClampedArray,
  w: number,
  palette: string[],
  dither: ReduceDither,
): Uint8ClampedArray {
  const colors = palette.map(fromHex);
  const out = new Uint8ClampedArray(rgba);
  if (!colors.length) return out;
  const spread = 256 / Math.cbrt(Math.max(2, colors.length));
  const error =
    dither === "diffusion" ? new Float32Array((rgba.length / 4) * 3) : null;
  const h = rgba.length / 4 / w;
  const cache = new Map<number, number>();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = p * 4;
      if (!rgba[i + 3]) continue;
      let c: RGB = { r: rgba[i]!, g: rgba[i + 1]!, b: rgba[i + 2]! };
      if (dither === "ordered") {
        const t = (BAYER[y & 3]![x & 3]! / 16 - 0.5) * spread;
        c = { r: c.r + t, g: c.g + t, b: c.b + t };
      } else if (error) {
        c = {
          r: c.r + error[p * 3]!,
          g: c.g + error[p * 3 + 1]!,
          b: c.b + error[p * 3 + 2]!,
        };
      }
      const key =
        dither === "none"
          ? (rgba[i]! << 16) | (rgba[i + 1]! << 8) | rgba[i + 2]!
          : -1;
      let at = key >= 0 ? cache.get(key) : undefined;
      if (at === undefined) {
        at = nearestIndex(c, colors);
        if (key >= 0) cache.set(key, at);
      }
      const to = colors[at]!;
      out[i] = to.r;
      out[i + 1] = to.g;
      out[i + 2] = to.b;
      if (error) {
        const errors = error;
        const spill = (dx: number, dy: number, share: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny >= h) return;
          const q = (ny * w + nx) * 3;
          errors[q] = errors[q]! + (c.r - to.r) * share;
          errors[q + 1] = errors[q + 1]! + (c.g - to.g) * share;
          errors[q + 2] = errors[q + 2]! + (c.b - to.b) * share;
        };
        spill(1, 0, 7 / 16);
        spill(-1, 1, 3 / 16);
        spill(0, 1, 5 / 16);
        spill(1, 1, 1 / 16);
      }
    }
  return out;
}
