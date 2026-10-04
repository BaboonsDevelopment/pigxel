import { linePoints, type Point } from "@/lib/edit/raster";
import type { BlendMode, GradientDither, GradientShape } from "./paint";
import type { TextFont } from "./text-fonts";

export { linePoints, type Point };

export type ColorSlot = "primary" | "secondary";

export type PenSettings = {
  color: string;
  secondary: string;
  recent: string[];
  fillShapes: boolean;
  ink: BlendMode | "shading";
  opacity: number;
  density: number;
  size: number;
  pixelPerfect: boolean;
  brushSize: number;
  brushShape: "round" | "line";
  brushAngle: number;
  eraserSize: number;
  sprayWidth: number;
  spraySpeed: number;
  contiguous: boolean;
  fillFrom: "layer" | "all";
  tolerance: number;
  gradientShape: GradientShape;
  gradientDither: GradientDither;
  textFont: TextFont;
  textScale: number;
  stabilizer: number;
  stampPattern: boolean;
  cornerRadius: number;
};

export const MIN_PEN_SIZE = 1;
export const MAX_PEN_SIZE = 16;
export const DEFAULT_PEN: PenSettings = {
  color: "#000000",
  secondary: "#ffffff",
  recent: [],
  fillShapes: false,
  ink: "simple",
  opacity: 255,
  density: 100,
  size: 1,
  pixelPerfect: true,
  brushSize: 3,
  eraserSize: 1,
  brushShape: "round",
  brushAngle: 45,
  sprayWidth: 4,
  spraySpeed: 40,
  contiguous: true,
  tolerance: 0,
  fillFrom: "layer",
  gradientShape: "linear",
  gradientDither: "bayer4",
  textFont: "tiny5",
  textScale: 1,
  stabilizer: 0,
  stampPattern: false,
  cornerRadius: 0,
};

export const MAX_CORNER_RADIUS = 32;

export const MAX_STABILIZER = 20;

export const clampStabilizer = (value: number) =>
  Math.min(MAX_STABILIZER, Math.max(0, Math.round(value) || 0));

export type SnapGrid = { w: number; h: number; x: number; y: number };

export const snapGridOf = (grid: number | SnapGrid | null): SnapGrid | null =>
  typeof grid === "number"
    ? grid > 0
      ? { w: grid, h: grid, x: 0, y: 0 }
      : null
    : grid && grid.w > 0 && grid.h > 0
      ? grid
      : null;

export function snapSpan(
  start: Point,
  point: Point,
  snap: number | SnapGrid | null,
): { from: Point; to: Point } {
  const grid = snapGridOf(snap);
  if (!grid) return { from: start, to: point };
  const axis = (a: number, b: number, size: number, offset: number) => {
    const first = Math.floor((a - offset) / size) * size + offset;
    const last = Math.floor((b - offset) / size) * size + offset;
    return b >= a ? [first, last + size - 1] : [first + size - 1, last];
  };
  const [fx, tx] = axis(start.x, point.x, grid.w, grid.x);
  const [fy, ty] = axis(start.y, point.y, grid.h, grid.y);
  return { from: { x: fx!, y: fy! }, to: { x: tx!, y: ty! } };
}

export function followRope(
  at: { x: number; y: number },
  target: Point,
  length: number,
): { x: number; y: number } {
  const dx = target.x - at.x;
  const dy = target.y - at.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= length) return at;
  const pull = (distance - length) / distance;
  return { x: at.x + dx * pull, y: at.y + dy * pull };
}

export const MIN_SPRAY_SPEED = 1;
export const MAX_SPRAY_SPEED = 100;

const SPRAY_DOTS_PER_SECOND = 200;

export function sprayDotCount(speed: number, seconds: number): number {
  return (SPRAY_DOTS_PER_SECOND * speed * seconds) / MAX_SPRAY_SPEED;
}

export function sprayDots(
  center: Point,
  radius: number,
  count: number,
  random = Math.random,
): Point[] {
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * (radius + 0.5);
    return {
      x: Math.round(center.x + Math.cos(angle) * distance),
      y: Math.round(center.y + Math.sin(angle) * distance),
    };
  });
}

export function clampOpacity(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(255, Math.round(value)))
    : 255;
}

export function clampTolerance(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(255, Math.round(value)))
    : 0;
}

export function clampPenSize(size: number) {
  return Math.max(MIN_PEN_SIZE, Math.min(MAX_PEN_SIZE, Math.round(size)));
}

export function extendStroke(stroke: Point[], to: Point): Point[] {
  const last = stroke.at(-1);
  if (!last) return [to];
  if (last.x === to.x && last.y === to.y) return stroke;
  return [...stroke, ...linePoints(last, to).slice(1)];
}

export function curvePoints(
  start: Point,
  c1: Point,
  c2: Point,
  end: Point,
): Point[] {
  const steps = Math.max(
    1,
    Math.ceil(
      2 *
        (Math.hypot(c1.x - start.x, c1.y - start.y) +
          Math.hypot(c2.x - c1.x, c2.y - c1.y) +
          Math.hypot(end.x - c2.x, end.y - c2.y)),
    ),
  );
  let points: Point[] = [start];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const along = (a: number, b: number, c: number, d: number) =>
      Math.round(
        u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d,
      );
    points = extendStroke(points, {
      x: along(start.x, c1.x, c2.x, end.x),
      y: along(start.y, c1.y, c2.y, end.y),
    });
  }
  return points;
}

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

export function brushOrigin(point: Point, size: number): Point {
  const offset = Math.floor((size - 1) / 2);
  return { x: point.x - offset, y: point.y - offset };
}

export function strokePixels(stroke: Point[], pen: PenSettings): Point[] {
  return pen.pixelPerfect && pen.size === 1 ? pixelPerfect(stroke) : stroke;
}

export type TipRect = { dx: number; dy: number; w: number; h: number };

export function brushTip(size: number, round: boolean): TipRect[] {
  if (!round || size <= 2) return [{ dx: 0, dy: 0, w: size, h: size }];
  const centre = (size - 1) / 2;
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

export function lineTip(size: number, angle: number): TipRect[] {
  const centre = (size - 1) / 2;
  const rad = ((Number.isFinite(angle) ? angle : 45) * Math.PI) / 180;
  const dx = Math.cos(rad) * centre;
  const dy = -Math.sin(rad) * centre;
  return linePoints(
    { x: Math.round(centre - dx), y: Math.round(centre - dy) },
    { x: Math.round(centre + dx), y: Math.round(centre + dy) },
  ).map((p) => ({ dx: p.x, dy: p.y, w: 1, h: 1 }));
}

export function fourConnected(stroke: Point[]): Point[] {
  return stroke.flatMap((p, i) => {
    const prev = stroke[i - 1];
    return prev && prev.x !== p.x && prev.y !== p.y
      ? [{ x: p.x, y: prev.y }, p]
      : [p];
  });
}

export function squareFrom(from: Point, to: Point, square: boolean): Point {
  if (!square) return to;
  const side = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  return {
    x: from.x + (to.x < from.x ? -side : side),
    y: from.y + (to.y < from.y ? -side : side),
  };
}

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

export function fillPoints(
  image: ImageData,
  start: Point,
  contiguous: boolean,
  tolerance = 0,
): number[] {
  const { width, height, data } = image;
  const first = start.y * width + start.x;
  const target = [0, 1, 2, 3].map((c) => data[first * 4 + c]!);
  const like = (i: number) => {
    for (let c = 0; c < 4; c++)
      if (Math.abs(data[i * 4 + c]! - target[c]!) > tolerance) return false;
    return true;
  };
  const out: number[] = [];
  if (!contiguous) {
    for (let i = 0; i < width * height; i++) if (like(i)) out.push(i);
    return out;
  }
  const seen = new Uint8Array(width * height);
  const stack = [first];
  seen[first] = 1;
  for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
    if (!like(i)) continue;
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

export function pixelColor(image: ImageData, point: Point): string | null {
  const i = (point.y * image.width + point.x) * 4;
  if (!image.data[i + 3]) return null;
  const hex = [0, 1, 2, 3]
    .slice(0, image.data[i + 3] === 255 ? 3 : 4)
    .map((c) => image.data[i + c]!.toString(16).padStart(2, "0"));
  return `#${hex.join("")}`;
}
