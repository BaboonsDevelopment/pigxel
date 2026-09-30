export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type RGBA = { r: number; g: number; b: number; a: number };

export const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

export const sameRect = (a: Rect, b: Rect) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** The box around every given rectangle, or null when there are none. */
export function unionOf(rects: (Rect | undefined)[]): Rect | null {
  const found = rects.filter((r): r is Rect => !!r);
  if (!found.length) return null;
  const x = Math.min(...found.map((r) => r.x));
  const y = Math.min(...found.map((r) => r.y));
  const right = Math.max(...found.map((r) => r.x + r.w));
  const bottom = Math.max(...found.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

export function hexToRgba(hex: string): RGBA {
  const v = hex.replace("#", "");
  const full = v.length === 3 ? [...v].map((c) => c + c).join("") : v;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: 255,
  };
}

/** Every pixel on the straight line from `a` to `b`, both ends included (Bresenham). */
export function linePoints(a: Point, b: Point): Point[] {
  const points: Point[] = [];
  const dx = Math.abs(b.x - a.x);
  const dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let { x, y } = a;
  let error = dx + dy;
  for (;;) {
    points.push({ x, y });
    if (x === b.x && y === b.y) return points;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y += sy;
    }
  }
}

export function rectPoints(r: Rect, filled: boolean): Point[] {
  const points: Point[] = [];
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      const edge =
        x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
      if (filled || edge) points.push({ x, y });
    }
  }
  return points;
}

export function ellipsePoints(r: Rect, filled: boolean): Point[] {
  const rx = (r.w - 1) / 2;
  const ry = (r.h - 1) / 2;
  const cx = r.x + rx;
  const cy = r.y + ry;
  const inside = (x: number, y: number, sx: number, sy: number) =>
    sx > 0 && sy > 0 && ((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2 <= 1;
  const points: Point[] = [];
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (!inside(x, y, rx + 0.5, ry + 0.5)) continue;
      if (filled || !inside(x, y, rx - 0.5, ry - 0.5)) points.push({ x, y });
    }
  }
  return points;
}

/** The connected same-coloured pixels around `start`, staying inside `bounds`. */
export function floodPoints(
  pixels: Uint8ClampedArray,
  width: number,
  start: Point,
  bounds: Rect,
): Point[] {
  const at = (p: Point) => (p.y * width + p.x) * 4;
  const target = pixels.slice(at(start), at(start) + 4).join(",");
  const seen = new Set<number>();
  const out: Point[] = [];
  const stack = [start];
  for (let p = stack.pop(); p; p = stack.pop()) {
    const { x, y } = p;
    if (x < bounds.x || y < bounds.y) continue;
    if (x >= bounds.x + bounds.w || y >= bounds.y + bounds.h) continue;
    const key = y * width + x;
    if (seen.has(key)) continue;
    seen.add(key);
    if (pixels.slice(at(p), at(p) + 4).join(",") !== target) continue;
    out.push(p);
    stack.push(
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    );
  }
  return out;
}

/**
 * The part of `area` that has something drawn, grown by `margin` pixels and
 * kept inside `area`; `area` itself when nothing is drawn there.
 */
export function paintedBounds(
  pixels: Uint8ClampedArray,
  width: number,
  area: Rect,
  margin: number,
): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = area.y; y < area.y + area.h; y++) {
    for (let x = area.x; x < area.x + area.w; x++) {
      if (!pixels[(y * width + x) * 4 + 3]) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  if (x0 > x1) return area;
  const left = Math.max(area.x, x0 - margin);
  const top = Math.max(area.y, y0 - margin);
  const right = Math.min(area.x + area.w - 1, x1 + margin);
  const bottom = Math.min(area.y + area.h - 1, y1 + margin);
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}
