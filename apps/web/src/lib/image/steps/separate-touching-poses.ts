import { components, type Component } from "@/lib/edit/objects";
import type { Bitmap } from "../bitmap";

/** Find one eroded body per cell, then grow labels back over the original ink.
 * Erosion is only used for seeds: no foreground pixels are discarded.
 */
export function separateTouchingPoses(
  image: Bitmap,
  grid: { cols: number; rows: number },
  count: number,
): Component[] | null {
  const { w, h, rgba } = image;
  const distance = new Uint16Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!rgba[i * 4 + 3]) continue;
      distance[i] = Math.min(x + 1, y + 1, w - x, h - y, 65534);
      if (x) distance[i] = Math.min(distance[i]!, distance[i - 1]! + 1);
      if (y) distance[i] = Math.min(distance[i]!, distance[i - w]! + 1);
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (x + 1 < w) distance[i] = Math.min(distance[i]!, distance[i + 1]! + 1);
      if (y + 1 < h) distance[i] = Math.min(distance[i]!, distance[i + w]! + 1);
    }
  const cellW = w / grid.cols,
    cellH = h / grid.rows;
  const slot = (c: Component) =>
    Math.floor((c.box.y + c.box.h / 2) / cellH) * grid.cols +
    Math.floor((c.box.x + c.box.w / 2) / cellW);
  const maxRadius = Math.max(
    2,
    Math.min(80, Math.ceil(Math.min(cellW, cellH) * 0.18)),
  );
  let seeds: Component[][] | null = null;
  for (const radius of [
    ...new Set(
      [1, 2, 4, 8, 16, 32, 48, maxRadius].filter((r) => r <= maxRadius),
    ),
  ]) {
    const core = new Uint8ClampedArray(rgba.length);
    for (let i = 0; i < distance.length; i++)
      if (distance[i]! > radius) core[i * 4 + 3] = 255;
    const parts = components(core, w, h, 4);
    const largest = parts.reduce((n, c) => Math.max(n, c.members.length), 0);
    const bodies = parts.filter(
      (c) => c.members.length >= Math.max(3, largest * 0.08),
    );
    const groups: Component[][] = Array.from({ length: count }, () => []);
    for (const c of bodies) groups[slot(c)]?.push(c);
    if (
      groups.every((g) => g.length > 0) &&
      bodies.every((c) => c.box.w <= cellW * 1.2 && c.box.h <= cellH * 1.2)
    ) {
      // Include detached eroded ears/tails in their cell's seed group as well.
      for (const c of parts) if (!bodies.includes(c)) groups[slot(c)]?.push(c);
      seeds = groups;
      break;
    }
  }
  if (!seeds) return null;
  const labels = new Int16Array(w * h).fill(-1);
  const queue = new Uint32Array(w * h);
  let tail = 0;
  seeds.forEach((group, label) =>
    group.forEach((c) =>
      c.members.forEach((i) => {
        labels[i] = label;
        queue[tail++] = i;
      }),
    ),
  );
  const add = (from: number, to: number) => {
    if (labels[to]! >= 0 || !rgba[to * 4 + 3]) return;
    labels[to] = labels[from]!;
    queue[tail++] = to;
  };
  for (let head = 0; head < tail; head++) {
    const i = queue[head]!,
      x = i % w,
      y = Math.floor(i / w);
    if (x) add(i, i - 1);
    if (x + 1 < w) add(i, i + 1);
    if (y) add(i, i - w);
    if (y + 1 < h) add(i, i + w);
  }
  const groups: number[][] = Array.from({ length: count }, () => []);
  for (let i = 0; i < labels.length; i++) {
    if (!rgba[i * 4 + 3]) continue;
    const label =
      labels[i]! >= 0
        ? labels[i]!
        : Math.min(
            count - 1,
            Math.floor(Math.floor(i / w) / cellH) * grid.cols +
              Math.floor((i % w) / cellW),
          );
    groups[label]!.push(i);
  }
  return groups.map((members) => {
    let x0 = w,
      y0 = h,
      x1 = 0,
      y1 = 0;
    for (const i of members) {
      const x = i % w,
        y = Math.floor(i / w);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return { members, box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
  });
}
