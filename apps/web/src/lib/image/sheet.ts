import { components, type Component } from "@/lib/edit/objects";
import {
  cropBitmap,
  opaqueBox,
  type Bitmap,
  type Box,
  type Size,
} from "./bitmap";
import { decodeImage } from "./decode";
import { imageToSprite } from "./quantize";
import { cutOutBackground } from "./steps/cut-out-background";
import { recoverPixelGrid } from "./steps/recover-pixel-grid";
import { removeStrayPixels } from "./steps/remove-stray-pixels";
import { paletteSize } from "./steps/shrink-to-tile";

type Grid = { cols: number; rows: number };

const MIN_PART = 3;
const POSE_GAP = 0.02;

const blank = (w: number, h: number): Bitmap => ({
  rgba: new Uint8ClampedArray(w * h * 4),
  w,
  h,
});

function paste(to: Bitmap, from: Bitmap, x: number, y: number) {
  for (let row = 0; row < from.h; row++) {
    const ty = y + row;
    if (ty < 0 || ty >= to.h) continue;
    for (let col = 0; col < from.w; col++) {
      const tx = x + col;
      if (tx < 0 || tx >= to.w) continue;
      const i = (row * from.w + col) * 4;
      if (from.rgba[i + 3])
        to.rgba.set(from.rgba.subarray(i, i + 4), (ty * to.w + tx) * 4);
    }
  }
}

type Group = { parts: Component[]; box: Box; size: number };

const centre = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const around = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
};
const near = (a: Box, b: Box, gap: number) =>
  a.x - gap < b.x + b.w &&
  b.x - gap < a.x + a.w &&
  a.y - gap < b.y + b.h &&
  b.y - gap < a.y + a.h;

function findPoses(parts: Component[], count: number, gap: number) {
  let groups: Group[] = parts.map((p) => ({
    parts: [p],
    box: p.box,
    size: p.members.length,
  }));
  for (let joined = true; joined;) {
    joined = false;
    for (let i = 0; i < groups.length && !joined; i++)
      for (let j = i + 1; j < groups.length && !joined; j++) {
        const [a, b] = [groups[i]!, groups[j]!];
        if (!near(a.box, b.box, gap)) continue;
        groups[i] = {
          parts: [...a.parts, ...b.parts],
          box: around(a.box, b.box),
          size: a.size + b.size,
        };
        groups.splice(j, 1);
        joined = true;
      }
  }
  while (groups.length > count) {
    groups.sort((a, b) => a.size - b.size);
    const [small, ...rest] = groups as [Group, ...Group[]];
    const c = centre(small.box);
    const distance = (g: Group) =>
      Math.hypot(centre(g.box).x - c.x, centre(g.box).y - c.y);
    const target = rest.reduce((a, b) => (distance(b) < distance(a) ? b : a));
    target.parts.push(...small.parts);
    target.box = around(target.box, small.box);
    target.size += small.size;
    groups = rest;
  }
  if (groups.length !== count) return null;
  groups.sort((a, b) => centre(a.box).y - centre(b.box).y);
  const rows: Group[][] = [];
  for (const g of groups) {
    const row = rows.at(-1);
    const top = row?.[0];
    if (row && top && centre(g.box).y < top.box.y + top.box.h) row.push(g);
    else rows.push([g]);
  }
  return rows.flatMap((row) =>
    row.sort((a, b) => centre(a.box).x - centre(b.box).x).map((g) => g.parts),
  );
}

function byGrid(image: Bitmap, parts: Component[], grid: Grid, count: number) {
  const cellW = image.w / grid.cols;
  const cellH = image.h / grid.rows;
  const cells: Component[][] = Array.from({ length: count }, () => []);
  for (const part of parts) {
    const { x, y } = centre(part.box);
    const col = Math.min(grid.cols - 1, Math.floor(x / cellW));
    const row = Math.min(grid.rows - 1, Math.floor(y / cellH));
    cells[row * grid.cols + col]?.push(part);
  }
  return cells;
}

export function splitSheet(
  image: Bitmap,
  grid: Grid,
  count: number,
): (Bitmap | null)[] {
  const parts = components(image.rgba, image.w, image.h).filter(
    (p) => p.members.length >= MIN_PART,
  );
  const gap = Math.max(1, Math.round(Math.min(image.w, image.h) * POSE_GAP));
  const poses =
    findPoses(parts, count, gap) ?? byGrid(image, parts, grid, count);
  return poses.map((parts) => {
    if (!parts.length) return null;
    const x0 = Math.min(...parts.map((p) => p.box.x));
    const y0 = Math.min(...parts.map((p) => p.box.y));
    const x1 = Math.max(...parts.map((p) => p.box.x + p.box.w));
    const y1 = Math.max(...parts.map((p) => p.box.y + p.box.h));
    const pose = blank(x1 - x0, y1 - y0);
    for (const i of parts.flatMap((p) => p.members)) {
      const x = (i % image.w) - x0;
      const y = Math.floor(i / image.w) - y0;
      pose.rgba.set(
        image.rgba.subarray(i * 4, i * 4 + 4),
        (y * pose.w + x) * 4,
      );
    }
    return pose;
  });
}

export function posesToFrames(
  poses: (Bitmap | null)[],
  box: Size,
  fill = false,
): (Bitmap | null)[] {
  const present = poses.filter((p): p is Bitmap => !!p);
  if (!present.length) return poses.map(() => null);
  const slotW = Math.max(...present.map((p) => p.w));
  const slotH = Math.max(...present.map((p) => p.h));
  const strip = blank(slotW * present.length, slotH);
  present.forEach((p, i) =>
    paste(strip, p, i * slotW + Math.floor((slotW - p.w) / 2), slotH - p.h),
  );
  const k = Math.min(box.w / slotW, box.h / slotH);
  const w = fill ? box.w : Math.max(1, Math.round(slotW * k));
  const h = fill ? box.h : Math.max(1, Math.round(slotH * k));
  const { buf } = imageToSprite(
    strip.rgba,
    strip.w,
    strip.h,
    w * present.length,
    h,
    { colors: paletteSize({ w, h }), keepBackground: true, fit: "stretch" },
  );
  const small: Bitmap = { rgba: buf, w: w * present.length, h };

  let next = 0;
  return poses.map((pose) => {
    if (!pose) return null;
    const slot = removeStrayPixels(
      cropBitmap(small, { x: next++ * w, y: 0, w, h }),
    );
    const frame = blank(box.w, box.h);
    paste(frame, slot, Math.floor((box.w - w) / 2), box.h - h);
    return frame;
  });
}

function sheetCells(
  image: Bitmap,
  grid: Grid,
  count: number,
): (Bitmap | null)[] {
  const w = Math.floor(image.w / grid.cols);
  const h = Math.floor(image.h / grid.rows);
  return Array.from({ length: count }, (_, i) => {
    const cell = cropBitmap(image, {
      x: (i % grid.cols) * w,
      y: Math.floor(i / grid.cols) * h,
      w,
      h,
    });
    return opaqueBox(cell) ? cell : null;
  });
}

export async function sheetToFrames(
  source: Blob,
  grid: Grid,
  count: number,
  box: Size,
  by: "poses" | "cells" = "poses",
): Promise<(Bitmap | null)[]> {
  const target = Math.max(box.w * grid.cols, box.h * grid.rows);
  const decoded = await decodeImage(source, target);
  const sheet = recoverPixelGrid(cutOutBackground(decoded));
  const parts =
    by === "cells"
      ? sheetCells(sheet, grid, count)
      : splitSheet(sheet, grid, count);
  return posesToFrames(parts, box, by === "cells");
}
