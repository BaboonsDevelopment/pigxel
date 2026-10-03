import type { Slice } from "@/lib/slices/slices";

export type ScaleMethod = "nearest" | "bilinear" | "rotsprite";

export const SCALE_METHODS: { value: ScaleMethod; label: string }[] = [
  { value: "nearest", label: "Nearest neighbour" },
  { value: "bilinear", label: "Bilinear" },
  { value: "rotsprite", label: "RotSprite" },
];

type Picture = { rgba: Uint8ClampedArray; w: number; h: number };

export function scalePicture(
  picture: Picture,
  w: number,
  h: number,
  method: ScaleMethod,
): Uint8ClampedArray {
  if (picture.w === w && picture.h === h)
    return new Uint8ClampedArray(picture.rgba);
  if (method === "bilinear") return bilinear(picture, w, h);
  if (method === "rotsprite") {
    let big = picture;
    for (let i = 0; i < 3; i++) big = scale2x(big);
    return nearest(big, w, h);
  }
  return nearest(picture, w, h);
}

function nearest(picture: Picture, w: number, h: number) {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(picture.h - 1, Math.floor(((y + 0.5) * picture.h) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(
        picture.w - 1,
        Math.floor(((x + 0.5) * picture.w) / w),
      );
      const from = (sy * picture.w + sx) * 4;
      out.set(picture.rgba.subarray(from, from + 4), (y * w + x) * 4);
    }
  }
  return out;
}

function bilinear(picture: Picture, w: number, h: number) {
  const { rgba } = picture;
  const out = new Uint8ClampedArray(w * h * 4);
  const at = (x: number, y: number) =>
    (Math.min(picture.h - 1, Math.max(0, y)) * picture.w +
      Math.min(picture.w - 1, Math.max(0, x))) *
    4;
  for (let y = 0; y < h; y++) {
    const fy = ((y + 0.5) * picture.h) / h - 0.5;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = ((x + 0.5) * picture.w) / w - 0.5;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const corners = [
        [at(x0, y0), (1 - tx) * (1 - ty)],
        [at(x0 + 1, y0), tx * (1 - ty)],
        [at(x0, y0 + 1), (1 - tx) * ty],
        [at(x0 + 1, y0 + 1), tx * ty],
      ] as const;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (const [i, weight] of corners) {
        const alpha = rgba[i + 3]! * weight;
        r += rgba[i]! * alpha;
        g += rgba[i + 1]! * alpha;
        b += rgba[i + 2]! * alpha;
        a += alpha;
      }
      const o = (y * w + x) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round(a);
      }
    }
  }
  return out;
}

export function scale2x({ rgba, w, h }: Picture): Picture {
  const px = new Uint32Array(new Uint8ClampedArray(rgba).buffer);
  const get = (x: number, y: number) =>
    px[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]!;
  const out = new Uint32Array(w * 2 * h * 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = get(x, y);
      const a = get(x, y - 1);
      const b = get(x + 1, y);
      const c = get(x - 1, y);
      const d = get(x, y + 1);
      const o = y * 2 * w * 2 + x * 2;
      out[o] = c === a && c !== d && a !== b ? a : p;
      out[o + 1] = a === b && a !== c && b !== d ? b : p;
      out[o + w * 2] = d === c && d !== b && c !== a ? c : p;
      out[o + w * 2 + 1] = b === d && b !== a && d !== c ? d : p;
    }
  return { rgba: new Uint8ClampedArray(out.buffer), w: w * 2, h: h * 2 };
}

export function sizeAtPercent(w: number, h: number, percent: number) {
  return {
    w: Math.max(1, Math.round((w * percent) / 100)),
    h: Math.max(1, Math.round((h * percent) / 100)),
  };
}

export function scaledSlices(
  slices: Slice[],
  from: { w: number; h: number },
  next: { w: number; h: number },
): Slice[] {
  const sx = next.w / from.w;
  const sy = next.h / from.h;
  const rect = (r: { x: number; y: number; w: number; h: number }) => {
    const x = Math.round(r.x * sx);
    const y = Math.round(r.y * sy);
    return {
      x,
      y,
      w: Math.round((r.x + r.w) * sx) - x,
      h: Math.round((r.y + r.h) * sy) - y,
    };
  };
  return slices.flatMap((slice) => {
    const bounds = rect(slice.bounds);
    if (bounds.w < 1 || bounds.h < 1) return [];
    const center = slice.center && rect(slice.center);
    const pivot = slice.pivot && {
      x: Math.min(bounds.w - 1, Math.floor(slice.pivot.x * sx)),
      y: Math.min(bounds.h - 1, Math.floor(slice.pivot.y * sy)),
    };
    return [
      {
        ...slice,
        bounds,
        center: center && center.w > 0 && center.h > 0 ? center : null,
        pivot,
      },
    ];
  });
}
