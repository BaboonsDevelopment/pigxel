import { colorDistance, isOpaque, rgbAt, type Bitmap } from "../bitmap";
import {
  GRID_SAME_COLOR,
  GRID_SLACK,
  GRID_STEP,
  MAX_GRID_CELL,
  MIN_GRID_CELL,
  MIN_GRID_FIT,
} from "../constants";

function runLengths(image: Bitmap): Map<number, number> {
  const counts = new Map<number, number>();
  const scan = (line: number[]) => {
    let start = 0;
    for (let k = 1; k <= line.length; k++) {
      const first = line[start]!;
      const next = line[k];
      const ends =
        next === undefined ||
        !isOpaque(image, next) ||
        !isOpaque(image, first) ||
        colorDistance(rgbAt(image, next), rgbAt(image, first)) >
          GRID_SAME_COLOR;
      if (!ends) continue;
      const before = line[start - 1];
      const bounded =
        before !== undefined &&
        isOpaque(image, before) &&
        next !== undefined &&
        isOpaque(image, next) &&
        isOpaque(image, first);
      if (bounded) counts.set(k - start, (counts.get(k - start) ?? 0) + 1);
      start = k;
    }
  };
  const { w, h } = image;
  for (let y = 0; y < h; y++)
    scan(Array.from({ length: w }, (_, x) => y * w + x));
  for (let x = 0; x < w; x++)
    scan(Array.from({ length: h }, (_, y) => y * w + x));
  return counts;
}

function gridFit(runs: Map<number, number>, cell: number) {
  let fitting = 0;
  let total = 0;
  let error = 0;
  for (const [run, n] of runs) {
    const cells = Math.max(1, Math.round(run / cell));
    const off = Math.abs(run - cells * cell);
    total += n;
    error += off * n;
    if (off <= GRID_SLACK) fitting += n;
  }
  return {
    share: total ? fitting / total : 0,
    error: total ? error / total : 0,
  };
}

function estimateCellSize(image: Bitmap): number | null {
  const runs = runLengths(image);
  let largest = 0;
  for (let cell = MAX_GRID_CELL; cell >= MIN_GRID_CELL; cell -= GRID_STEP) {
    if (gridFit(runs, cell).share >= MIN_GRID_FIT) {
      largest = cell;
      break;
    }
  }
  if (!largest) return null;
  let best = largest;
  for (let cell = largest; cell >= largest * 0.85; cell -= GRID_STEP) {
    if (gridFit(runs, cell).error < gridFit(runs, best).error) best = cell;
  }
  return best;
}

function sampleCell(
  image: Bitmap,
  x0: number,
  y0: number,
  cell: number,
): Uint8ClampedArray {
  const inset = cell / 4;
  const colors = new Map<number, { rgba: number[]; n: number }>();
  let opaque = 0;
  let total = 0;
  for (let y = Math.floor(y0 + inset); y < y0 + cell - inset; y++) {
    for (let x = Math.floor(x0 + inset); x < x0 + cell - inset; x++) {
      if (x >= image.w || y >= image.h) continue;
      const i = y * image.w + x;
      total++;
      if (!isOpaque(image, i)) continue;
      opaque++;
      const { r, g, b } = rgbAt(image, i);
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const entry = colors.get(key) ?? { rgba: [r, g, b, 255], n: 0 };
      entry.n++;
      colors.set(key, entry);
    }
  }
  if (!total || opaque * 2 < total) return new Uint8ClampedArray(4);
  const best = [...colors.values()].reduce((a, b) => (b.n > a.n ? b : a));
  return new Uint8ClampedArray(best.rgba);
}

export function recoverPixelGrid(image: Bitmap): Bitmap {
  const cell = estimateCellSize(image);
  if (!cell) return image;
  const w = Math.max(1, Math.round(image.w / cell));
  const h = Math.max(1, Math.round(image.h / cell));
  const cellW = image.w / w;
  const cellH = image.h / h;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const size = Math.min(cellW, cellH);
      rgba.set(sampleCell(image, x * cellW, y * cellH, size), (y * w + x) * 4);
    }
  }
  return { rgba, w, h };
}
