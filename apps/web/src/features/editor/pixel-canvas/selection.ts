import { ellipsePoints, linePoints } from "@/lib/edit/raster";
import type { Area, Size } from "./constants";
import type { Rgba } from "./paint";
import { fillPoints, type Point } from "./pen";

export type Mask = Uint8Array;

export type SelectMode = "replace" | "add" | "subtract" | "intersect";

export function selectModeOf(e: { shiftKey: boolean; altKey: boolean }) {
  if (e.shiftKey && e.altKey) return "intersect";
  if (e.shiftKey) return "add";
  if (e.altKey) return "subtract";
  return "replace";
}

export function rectMask(size: Size, area: Area): Mask {
  const mask = new Uint8Array(size.w * size.h);
  for (let y = Math.max(0, area.y); y < Math.min(size.h, area.y + area.h); y++)
    mask.fill(
      1,
      y * size.w + Math.max(0, area.x),
      y * size.w + Math.min(size.w, area.x + area.w),
    );
  return mask;
}

export function ellipseMask(size: Size, area: Area): Mask {
  const mask = new Uint8Array(size.w * size.h);
  for (const { x, y } of ellipsePoints(area, true))
    if (x >= 0 && y >= 0 && x < size.w && y < size.h) mask[y * size.w + x] = 1;
  return mask;
}

export function polygonMask(size: Size, points: Point[]): Mask {
  const mask = new Uint8Array(size.w * size.h);
  const set = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < size.w && y < size.h) mask[y * size.w + x] = 1;
  };
  for (let y = 0; y < size.h; y++) {
    const cy = y + 0.5;
    const crossings: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i]!;
      const b = points[(i + 1) % points.length]!;
      const ay = a.y + 0.5;
      const by = b.y + 0.5;
      if (ay <= cy === by <= cy) continue;
      crossings.push(a.x + 0.5 + ((cy - ay) / (by - ay)) * (b.x - a.x));
    }
    crossings.sort((p, q) => p - q);
    for (let i = 0; i + 1 < crossings.length; i += 2)
      for (
        let x = Math.ceil(crossings[i]! - 0.5);
        x + 0.5 <= crossings[i + 1]!;
        x++
      )
        set(x, y);
  }
  for (let i = 0; i < points.length; i++)
    for (const p of linePoints(points[i]!, points[(i + 1) % points.length]!))
      set(p.x, p.y);
  return mask;
}

export function wandMask(
  pixels: Uint8ClampedArray,
  size: Size,
  start: Point,
  contiguous: boolean,
  tolerance = 0,
): Mask {
  const mask = new Uint8Array(size.w * size.h);
  if (start.x < 0 || start.y < 0 || start.x >= size.w || start.y >= size.h)
    return mask;
  const image = { width: size.w, height: size.h, data: pixels };
  for (const i of fillPoints(image as ImageData, start, contiguous, tolerance))
    mask[i] = 1;
  return mask;
}

export function combineMasks(
  base: Mask | null,
  next: Mask,
  mode: SelectMode,
): Mask | null {
  let out: Mask;
  if (mode === "replace" || !base) {
    out =
      mode === "subtract" || mode === "intersect" ? new Uint8Array(0) : next;
  } else {
    out = new Uint8Array(base.length);
    for (let i = 0; i < base.length; i++)
      out[i] =
        mode === "add"
          ? base[i]! | next[i]!
          : mode === "subtract"
            ? base[i]! & (next[i]! ^ 1)
            : base[i]! & next[i]!;
  }
  return out.some(Boolean) ? out : null;
}

export function invertMask(mask: Mask | null, size: Size): Mask | null {
  const out = new Uint8Array(size.w * size.h);
  for (let i = 0; i < out.length; i++) out[i] = mask?.[i] ? 0 : 1;
  return out.some(Boolean) ? out : null;
}

export function maskBounds(mask: Mask, size: Size): Area | null {
  let x0 = size.w;
  let y0 = size.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < size.h; y++)
    for (let x = 0; x < size.w; x++)
      if (mask[y * size.w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export const isSelected = (mask: Mask | null, size: Size, p: Point) =>
  !!mask &&
  p.x >= 0 &&
  p.y >= 0 &&
  p.x < size.w &&
  p.y < size.h &&
  !!mask[p.y * size.w + p.x];

export function maskOutline(mask: Mask, size: Size): string {
  const on = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size.w && y < size.h && !!mask[y * size.w + x];
  const parts: string[] = [];
  for (let y = 0; y <= size.h; y++) {
    let start = -1;
    for (let x = 0; x <= size.w; x++) {
      const edge = x < size.w && on(x, y) !== on(x, y - 1);
      if (edge && start < 0) start = x;
      if (!edge && start >= 0) {
        parts.push(`M${start} ${y}H${x}`);
        start = -1;
      }
    }
  }
  for (let x = 0; x <= size.w; x++) {
    let start = -1;
    for (let y = 0; y <= size.h; y++) {
      const edge = y < size.h && on(x, y) !== on(x - 1, y);
      if (edge && start < 0) start = y;
      if (!edge && start >= 0) {
        parts.push(`M${x} ${start}V${y}`);
        start = -1;
      }
    }
  }
  return parts.join("");
}

export type Floating = {
  x: number;
  y: number;
  w: number;
  h: number;
  pixels: Uint8ClampedArray;
  mask: Mask;
};

export function liftPixels(
  cel: Uint8ClampedArray,
  size: Size,
  mask: Mask,
  fill: Rgba | null,
): { floating: Floating; under: Uint8ClampedArray } | null {
  const bounds = maskBounds(mask, size);
  if (!bounds) return null;
  const under = new Uint8ClampedArray(cel);
  const pixels = new Uint8ClampedArray(bounds.w * bounds.h * 4);
  const piece = new Uint8Array(bounds.w * bounds.h);
  const empty = fill ?? [0, 0, 0, 0];
  for (let y = 0; y < bounds.h; y++)
    for (let x = 0; x < bounds.w; x++) {
      const i = (bounds.y + y) * size.w + bounds.x + x;
      if (!mask[i]) continue;
      const j = y * bounds.w + x;
      piece[j] = 1;
      pixels.set(cel.subarray(i * 4, i * 4 + 4), j * 4);
      under.set(empty, i * 4);
    }
  return { floating: { ...bounds, pixels, mask: piece }, under };
}

export function stampFloating(
  under: Uint8ClampedArray,
  size: Size,
  f: Floating,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(under);
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const tx = f.x + x;
      const ty = f.y + y;
      const j = y * f.w + x;
      if (tx < 0 || ty < 0 || tx >= size.w || ty >= size.h) continue;
      if (!f.mask[j] || !f.pixels[j * 4 + 3]) continue;
      out.set(f.pixels.subarray(j * 4, j * 4 + 4), (ty * size.w + tx) * 4);
    }
  return out;
}

export function floatingMask(f: Floating, size: Size): Mask | null {
  const mask = new Uint8Array(size.w * size.h);
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      const tx = f.x + x;
      const ty = f.y + y;
      if (tx < 0 || ty < 0 || tx >= size.w || ty >= size.h) continue;
      if (f.mask[y * f.w + x]) mask[ty * size.w + tx] = 1;
    }
  return mask.some(Boolean) ? mask : null;
}

function remap(
  f: Floating,
  w: number,
  h: number,
  from: (x: number, y: number) => number,
): Pick<Floating, "w" | "h" | "pixels" | "mask"> {
  const pixels = new Uint8ClampedArray(w * h * 4);
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const j = from(x, y);
      mask[y * w + x] = f.mask[j]!;
      pixels.set(f.pixels.subarray(j * 4, j * 4 + 4), (y * w + x) * 4);
    }
  return { w, h, pixels, mask };
}

export function flipFloating(
  f: Floating,
  axis: "horizontal" | "vertical",
): Floating {
  return {
    ...f,
    ...remap(f, f.w, f.h, (x, y) =>
      axis === "horizontal" ? y * f.w + (f.w - 1 - x) : (f.h - 1 - y) * f.w + x,
    ),
  };
}

export function rotateFloating(f: Floating, clockwise: boolean): Floating {
  const w = f.h;
  const h = f.w;
  return {
    ...remap(f, w, h, (x, y) =>
      clockwise ? (f.h - 1 - x) * f.w + y : x * f.w + (f.w - 1 - y),
    ),
    x: f.x + Math.floor((f.w - w) / 2),
    y: f.y + Math.floor((f.h - h) / 2),
  };
}

export type ModifyShape = "round" | "square";

export const MAX_MODIFY = 32;

export function expandMask(
  mask: Mask,
  size: Size,
  by: number,
  shape: ModifyShape = "round",
): Mask {
  const out = new Uint8Array(mask);
  const offsets = reach(by, shape);
  const { w, h } = size;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x] || !onEdge(mask, w, h, x, y)) continue;
      for (const [dx, dy] of offsets) {
        const tx = x + dx;
        const ty = y + dy;
        if (tx >= 0 && ty >= 0 && tx < w && ty < h) out[ty * w + tx] = 1;
      }
    }
  return out;
}

export function contractMask(
  mask: Mask,
  size: Size,
  by: number,
  shape: ModifyShape = "round",
): Mask {
  const out = new Uint8Array(mask);
  const offsets = reach(by, shape);
  const { w, h } = size;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] || !nextToSelected(mask, w, h, x, y)) continue;
      clear(x, y);
    }
  for (let x = -1; x <= w; x++) {
    clear(x, -1);
    clear(x, h);
  }
  for (let y = 0; y < h; y++) {
    clear(-1, y);
    clear(w, y);
  }
  return out;

  function clear(x: number, y: number) {
    for (const [dx, dy] of offsets) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx >= 0 && ty >= 0 && tx < w && ty < h) out[ty * w + tx] = 0;
    }
  }
}

export function borderMask(
  mask: Mask,
  size: Size,
  by: number,
  shape: ModifyShape = "round",
): Mask {
  const inner = contractMask(mask, size, by, shape);
  return mask.map((m, i) => (m && !inner[i] ? 1 : 0));
}

function reach(by: number, shape: ModifyShape): [number, number][] {
  const offsets: [number, number][] = [];
  for (let dy = -by; dy <= by; dy++)
    for (let dx = -by; dx <= by; dx++)
      if ((dx || dy) && (shape === "square" || dx * dx + dy * dy <= by * by))
        offsets.push([dx, dy]);
  return offsets;
}

function onEdge(mask: Mask, w: number, h: number, x: number, y: number) {
  for (const [dx, dy] of NEIGHBOURS) {
    const tx = x + dx;
    const ty = y + dy;
    if (tx < 0 || ty < 0 || tx >= w || ty >= h || !mask[ty * w + tx])
      return true;
  }
  return false;
}

function nextToSelected(
  mask: Mask,
  w: number,
  h: number,
  x: number,
  y: number,
) {
  for (const [dx, dy] of NEIGHBOURS) {
    const tx = x + dx;
    const ty = y + dy;
    if (tx >= 0 && ty >= 0 && tx < w && ty < h && mask[ty * w + tx])
      return true;
  }
  return false;
}

const NEIGHBOURS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;
