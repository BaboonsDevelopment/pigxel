export type Point = { x: number; y: number };

export type PenSettings = {
  /** CSS color the pen paints with. */
  color: string;
  /** Width and height of the square brush, in tile pixels. */
  size: number;
  /** Removes the corner pixel from L-shaped steps in freehand strokes. */
  pixelPerfect: boolean;
};

export const MIN_PEN_SIZE = 1;
export const MAX_PEN_SIZE = 16;
export const DEFAULT_PEN: PenSettings = {
  color: "#000000",
  size: 1,
  pixelPerfect: true,
};

export function clampPenSize(size: number) {
  return Math.max(MIN_PEN_SIZE, Math.min(MAX_PEN_SIZE, Math.round(size)));
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

/** Adds the pixels leading to `to` onto a stroke, skipping the repeated start pixel. */
export function extendStroke(stroke: Point[], to: Point): Point[] {
  const last = stroke.at(-1);
  if (!last) return [to];
  if (last.x === to.x && last.y === to.y) return stroke;
  return [...stroke, ...linePoints(last, to).slice(1)];
}

/**
 * Drops the middle pixel of every L-shaped corner, so a freehand line is one
 * pixel thick with only diagonal steps (Aseprite's "pixel-perfect" mode).
 */
export function pixelPerfect(stroke: Point[]): Point[] {
  const out: Point[] = [];
  for (const point of stroke) {
    const a = out.at(-2);
    const b = out.at(-1);
    if (
      a &&
      b &&
      (a.x === b.x || a.y === b.y) &&
      (b.x === point.x || b.y === point.y) &&
      Math.abs(a.x - point.x) === 1 &&
      Math.abs(a.y - point.y) === 1
    ) {
      out.pop();
    }
    out.push(point);
  }
  return out;
}

/** Top-left pixel of a square brush centred on `point`. */
export function brushOrigin(point: Point, size: number): Point {
  const offset = Math.floor((size - 1) / 2);
  return { x: point.x - offset, y: point.y - offset };
}

/** The pixels a stroke paints, after applying pixel-perfect when it's on and the brush is 1px. */
export function strokePixels(stroke: Point[], pen: PenSettings): Point[] {
  return pen.pixelPerfect && pen.size === 1 ? pixelPerfect(stroke) : stroke;
}
