import { scale2x } from "@/lib/sprite/sprite-size";
import type { Floating } from "./selection";

/**
 * Free transform of a floating piece, as Aseprite's selection handles:
 * scale, rotate by any angle and skew, always worked out from the piece as
 * it was lifted, so many small changes don't blur it.
 */
export type FreeTransform = {
  /** Where the piece's centre is, in tile pixels. */
  cx: number;
  cy: number;
  /** 1 is the lifted size; negative mirrors. */
  scaleX: number;
  scaleY: number;
  /** Clockwise, in degrees. */
  angle: number;
  /** Horizontal slant, in degrees. */
  skew: number;
  /**
   * How pixels are picked: "rotsprite" keeps pixel art clean when turned (the
   * piece is enlarged 8× with Scale2x first), "nearest" takes the nearest pixel.
   */
  method: "rotsprite" | "nearest";
};

/** No change: the piece where it is. */
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

type Matrix = [number, number, number, number]; // a b c d: x' = a x + b y, y' = c x + d y

/** The linear part of `t`: scale, then skew, then rotation. */
export function matrixOf(t: FreeTransform): Matrix {
  const r = (t.angle * Math.PI) / 180;
  const k = Math.tan((t.skew * Math.PI) / 180);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  // Skew x by k after scaling: [sx, k*sy; 0, sy]
  const a0 = t.scaleX;
  const b0 = k * t.scaleY;
  const d0 = t.scaleY;
  return [cos * a0, cos * b0 - sin * d0, sin * a0, sin * b0 + cos * d0];
}

/** Where a point relative to the piece's centre (unchanged) ends up, relative to the new centre. */
export function apply(m: Matrix, x: number, y: number) {
  return { x: m[0] * x + m[1] * y, y: m[2] * x + m[3] * y };
}

/** The four corners of the transformed piece, in tile pixels, clockwise from the top-left. */
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

/** The piece enlarged 8× with Scale2x three times, for RotSprite; kept per piece. */
const enlarged = new WeakMap<
  Floating,
  { rgba: Uint8ClampedArray; w: number; h: number }
>();

function enlargedOf(piece: Floating) {
  let big = enlarged.get(piece);
  if (!big) {
    // Unselected pixels are clear, so they don't bleed into the edges.
    const rgba = new Uint8ClampedArray(piece.pixels);
    for (let i = 0; i < piece.mask.length; i++)
      if (!piece.mask[i]) rgba.fill(0, i * 4, i * 4 + 4);
    big = { rgba, w: piece.w, h: piece.h };
    for (let i = 0; i < 3; i++) big = scale2x(big);
    enlarged.set(piece, big);
  }
  return big;
}

/** `source` scaled, turned and slanted by `t`, as a new floating piece. */
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
  // The inverse maps a tile pixel back into the source.
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
      // The pixel's centre, relative to the new centre, back in the source.
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

/** Whether `t` leaves the piece as it was lifted (only moved, maybe). */
export function onlyMoved(t: FreeTransform) {
  return t.scaleX === 1 && t.scaleY === 1 && t.angle === 0 && t.skew === 0;
}
