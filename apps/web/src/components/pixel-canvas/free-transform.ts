import { scale2x } from "@/lib/sprite/sprite-size";
import type { Floating } from "./selection";

export type FreeTransform = {
  cx: number;
  cy: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  skew: number;
  method: "rotsprite" | "nearest";
};

export function identityTransform(piece: {
  x: number;
  y: number;
  w: number;
  h: number;
}): FreeTransform {
  return {
    cx: piece.x + piece.w / 2,
    cy: piece.y + piece.h / 2,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    skew: 0,
    method: "rotsprite",
  };
}

type Matrix = [number, number, number, number];

function matrixOf(t: FreeTransform): Matrix {
  const r = (t.angle * Math.PI) / 180;
  const k = Math.tan((t.skew * Math.PI) / 180);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const a0 = t.scaleX;
  const b0 = k * t.scaleY;
  const d0 = t.scaleY;
  return [cos * a0, cos * b0 - sin * d0, sin * a0, sin * b0 + cos * d0];
}

function apply(m: Matrix, x: number, y: number) {
  return { x: m[0] * x + m[1] * y, y: m[2] * x + m[3] * y };
}

export function cornersOf(piece: { w: number; h: number }, t: FreeTransform) {
  const m = matrixOf(t);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => {
    const p = apply(m, (sx! * piece.w) / 2, (sy! * piece.h) / 2);
    return { x: t.cx + p.x, y: t.cy + p.y };
  });
}

const enlarged = new WeakMap<
  Floating,
  { rgba: Uint8ClampedArray; w: number; h: number }
>();

function enlargedOf(piece: Floating) {
  let big = enlarged.get(piece);
  if (!big) {
    const rgba = new Uint8ClampedArray(piece.pixels);
    for (let i = 0; i < piece.mask.length; i++)
      if (!piece.mask[i]) rgba.fill(0, i * 4, i * 4 + 4);
    big = { rgba, w: piece.w, h: piece.h };
    for (let i = 0; i < 3; i++) big = scale2x(big);
    enlarged.set(piece, big);
  }
  return big;
}

export function transformFloating(
  source: Floating,
  t: FreeTransform,
): Floating {
  const m = matrixOf(t);
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-9)
    return {
      x: Math.round(t.cx),
      y: Math.round(t.cy),
      w: 0,
      h: 0,
      pixels: new Uint8ClampedArray(),
      mask: new Uint8Array(),
    };
  const inv: Matrix = [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
  const corners = cornersOf(source, t);
  const x0 = Math.floor(Math.min(...corners.map((c) => c.x)) + 1e-6);
  const y0 = Math.floor(Math.min(...corners.map((c) => c.y)) + 1e-6);
  const x1 = Math.ceil(Math.max(...corners.map((c) => c.x)) - 1e-6);
  const y1 = Math.ceil(Math.max(...corners.map((c) => c.y)) - 1e-6);
  const w = Math.max(0, x1 - x0);
  const h = Math.max(0, y1 - y0);
  const pixels = new Uint8ClampedArray(w * h * 4);
  const mask = new Uint8Array(w * h);
  const big = t.method === "rotsprite" ? enlargedOf(source) : null;
  const k = big ? 8 : 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x0 + x + 0.5 - t.cx;
      const dy = y0 + y + 0.5 - t.cy;
      const sx = inv[0] * dx + inv[1] * dy + source.w / 2;
      const sy = inv[2] * dx + inv[3] * dy + source.h / 2;
      if (sx < 0 || sy < 0 || sx >= source.w || sy >= source.h) continue;
      const j = Math.floor(sy) * source.w + Math.floor(sx);
      if (!source.mask[j]) continue;
      const o = y * w + x;
      mask[o] = 1;
      if (big) {
        const bx = Math.min(big.w - 1, Math.floor(sx * k));
        const by = Math.min(big.h - 1, Math.floor(sy * k));
        const b = (by * big.w + bx) * 4;
        pixels.set(big.rgba.subarray(b, b + 4), o * 4);
      } else pixels.set(source.pixels.subarray(j * 4, j * 4 + 4), o * 4);
    }
  return { x: x0, y: y0, w, h, pixels, mask };
}
