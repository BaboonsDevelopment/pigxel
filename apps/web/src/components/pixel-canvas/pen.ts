import { linePoints, type Point } from "@/lib/edit/raster";

// The tools draw with the same pixel lines as AI edits.
export { linePoints, type Point };

/** What a click on the tile does. */
export type PaintTool =
  "pen" | "brush" | "eraser" | "line" | "bucket" | "pipette";

/** Settings of the painting tools, shared by all tiles. */
export type PenSettings = {
  /** CSS color every tool paints with. */
  color: string;
  /** Width and height of the square pen and line, in tile pixels. */
  size: number;
  /** Removes the corner pixel from L-shaped steps in freehand strokes. */
  pixelPerfect: boolean;
  /** Diameter of the round brush, in tile pixels. */
  brushSize: number;
  /** Width and height of the square eraser, in tile pixels. */
  eraserSize: number;
  /** The bucket fills only the connected area, not every pixel of that colour. */
  contiguous: boolean;
};

export const MIN_PEN_SIZE = 1;
export const MAX_PEN_SIZE = 16;
export const DEFAULT_PEN: PenSettings = {
  color: "#000000",
  size: 1,
  pixelPerfect: true,
  brushSize: 3,
  eraserSize: 1,
  contiguous: true,
};

export function clampPenSize(size: number) {
  return Math.max(MIN_PEN_SIZE, Math.min(MAX_PEN_SIZE, Math.round(size)));
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

/** A rectangle of a brush tip, relative to the tip's top-left pixel. */
export type TipRect = { dx: number; dy: number; w: number; h: number };

/**
 * The pixels a brush tip covers, as rectangles: one for a square tip, one per
 * row for a round one (so a 3px round tip is a plus, a 5px one a small disc).
 */
export function brushTip(size: number, round: boolean): TipRect[] {
  if (!round || size <= 2) return [{ dx: 0, dy: 0, w: size, h: size }];
  const centre = (size - 1) / 2;
  // Slightly under half the size, so small tips come out round, not square.
  const radius = size / 2 - 0.1;
  const rows: TipRect[] = [];
  for (let dy = 0; dy < size; dy++) {
    const half = Math.sqrt(Math.max(0, radius ** 2 - (dy - centre) ** 2));
    const dx = Math.ceil(centre - half);
    const w = Math.floor(centre + half) - dx + 1;
    if (w > 0) rows.push({ dx, dy, w, h: 1 });
  }
  return rows;
}

/**
 * The end of a line from `from` towards `to`, snapped to the nearest
 * horizontal, vertical or 45° direction.
 */
export function snapLine(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(Math.abs(dy), Math.abs(dx));
  if (angle < Math.PI / 8) return { x: to.x, y: from.y };
  if (angle > (3 * Math.PI) / 8) return { x: from.x, y: to.y };
  const length = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: from.x + Math.sign(dx) * length,
    y: from.y + Math.sign(dy) * length,
  };
}

/** The pixels of `image` a bucket click at `start` repaints. */
export function fillPoints(
  image: ImageData,
  start: Point,
  contiguous: boolean,
): number[] {
  const { width, height, data } = image;
  const at = (i: number) =>
    data[i * 4]! |
    (data[i * 4 + 1]! << 8) |
    (data[i * 4 + 2]! << 16) |
    (data[i * 4 + 3]! << 24);
  const first = start.y * width + start.x;
  const target = at(first);
  const out: number[] = [];
  if (!contiguous) {
    for (let i = 0; i < width * height; i++) if (at(i) === target) out.push(i);
    return out;
  }
  const seen = new Uint8Array(width * height);
  const stack = [first];
  seen[first] = 1;
  for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
    if (at(i) !== target) continue;
    out.push(i);
    const x = i % width;
    const next = [
      x > 0 ? i - 1 : -1,
      x < width - 1 ? i + 1 : -1,
      i - width,
      i + width,
    ];
    for (const n of next) {
      if (n < 0 || n >= width * height || seen[n]) continue;
      seen[n] = 1;
      stack.push(n);
    }
  }
  return out;
}

/** The `#rrggbb` colour of a pixel, or null when it's fully transparent. */
export function pixelColor(image: ImageData, point: Point): string | null {
  const i = (point.y * image.width + point.x) * 4;
  if (!image.data[i + 3]) return null;
  const hex = [0, 1, 2].map((c) =>
    image.data[i + c]!.toString(16).padStart(2, "0"),
  );
  return `#${hex.join("")}`;
}
