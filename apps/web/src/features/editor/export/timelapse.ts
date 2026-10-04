import type { Size } from "@/lib/image/bitmap";
import {
  TIMELAPSE_ART_SHARE,
  TIMELAPSE_FPS,
  TIMELAPSE_HOLD,
  TIMELAPSE_LEAD_IN,
  TIMELAPSE_OUTRO,
  TIMELAPSE_SEED,
  TIMELAPSE_SHAPES,
  type TimelapseShape,
  type TimelapseStyle,
} from "./constants";

type Strokes = { at: Uint32Array; rgba: Uint8ClampedArray };

type TimelapseTiming = {
  leadIn: number;
  draw: number;
  hold: number;
  outro: number;
  total: number;
};

type Placement = { x: number; y: number; w: number; h: number };

const luminance = (rgba: Uint8ClampedArray, p: number) =>
  0.2126 * rgba[p]! + 0.7152 * rgba[p + 1]! + 0.0722 * rgba[p + 2]!;

const colorKey = (rgba: Uint8ClampedArray, p: number) =>
  ((rgba[p]! << 24) |
    (rgba[p + 1]! << 16) |
    (rgba[p + 2]! << 8) |
    rgba[p + 3]!) >>>
  0;

function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function byColor(pixels: number[], rgba: Uint8ClampedArray) {
  const colors = new Map<number, { light: number; n: number }>();
  const keys = pixels.map((i) => {
    const key = colorKey(rgba, i * 4);
    const color = colors.get(key);
    if (color) color.n++;
    else colors.set(key, { light: luminance(rgba, i * 4), n: 1 });
    return key;
  });
  const rank = new Map(
    [...colors]
      .sort(([a, ca], [b, cb]) => ca.light - cb.light || cb.n - ca.n || a - b)
      .map(([key], i) => [key, i]),
  );
  return pixels
    .map((i, k) => ({ i, rank: rank.get(keys[k]!)! }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ i }) => i);
}

function scattered(pixels: number[]) {
  const next = random(TIMELAPSE_SEED);
  const out = [...pixels];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function fromCenter(pixels: number[], { w, h }: Size) {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const distance = (i: number) =>
    ((i % w) - cx) ** 2 + (Math.floor(i / w) - cy) ** 2;
  return pixels
    .map((i) => ({ i, d: distance(i) }))
    .sort((a, b) => a.d - b.d)
    .map(({ i }) => i);
}

function strokesOf(order: number[], rgba: Uint8ClampedArray): Strokes {
  const out = new Uint8ClampedArray(order.length * 4);
  order.forEach((i, k) => out.set(rgba.subarray(i * 4, i * 4 + 4), k * 4));
  return { at: Uint32Array.from(order), rgba: out };
}

function layerStrokes(stages: Uint8ClampedArray[], length: number): Strokes {
  const at: number[] = [];
  const out: number[] = [];
  let before: Uint8ClampedArray = new Uint8ClampedArray(length);
  for (const stage of stages) {
    for (let p = 0; p < length; p += 4)
      if (
        stage[p] !== before[p] ||
        stage[p + 1] !== before[p + 1] ||
        stage[p + 2] !== before[p + 2] ||
        stage[p + 3] !== before[p + 3]
      ) {
        at.push(p / 4);
        out.push(stage[p]!, stage[p + 1]!, stage[p + 2]!, stage[p + 3]!);
      }
    before = stage;
  }
  return { at: Uint32Array.from(at), rgba: Uint8ClampedArray.from(out) };
}

export function paintOrder(
  stages: Uint8ClampedArray[],
  size: Size,
  style: TimelapseStyle,
): Strokes {
  const length = size.w * size.h * 4;
  if (style === "layers") return layerStrokes(stages, length);
  const final = stages.at(-1) ?? new Uint8ClampedArray(length);
  const pixels: number[] = [];
  for (let i = 0; i < size.w * size.h; i++)
    if (final[i * 4 + 3]) pixels.push(i);
  const order =
    style === "colors"
      ? byColor(pixels, final)
      : style === "scatter"
        ? scattered(pixels)
        : style === "center"
          ? fromCenter(pixels, size)
          : pixels;
  return strokesOf(order, final);
}

export function paint(
  canvas: Uint8ClampedArray,
  strokes: Strokes,
  from: number,
  to: number,
) {
  for (let k = from; k < to; k++)
    canvas.set(strokes.rgba.subarray(k * 4, k * 4 + 4), strokes.at[k]! * 4);
}

export function timelapseTiming(seconds: number): TimelapseTiming {
  const frames = (s: number) => Math.round(s * TIMELAPSE_FPS);
  const leadIn = frames(TIMELAPSE_LEAD_IN);
  const draw = Math.max(1, frames(seconds));
  const hold = frames(TIMELAPSE_HOLD);
  const outro = frames(TIMELAPSE_OUTRO);
  return { leadIn, draw, hold, outro, total: leadIn + draw + hold + outro };
}

export function strokesBy(
  frame: number,
  timing: TimelapseTiming,
  count: number,
) {
  const drawn = Math.min(timing.draw, Math.max(0, frame - timing.leadIn + 1));
  return Math.ceil((count * drawn) / timing.draw);
}

export function outroTime(frame: number, timing: TimelapseTiming) {
  return (frame - timing.leadIn - timing.draw - timing.hold) / TIMELAPSE_FPS;
}

export const timelapseSize = (shape: TimelapseShape): Size => ({
  ...TIMELAPSE_SHAPES.find((s) => s.id === shape)!.size,
});

export function artPlacement(video: Size, tile: Size): Placement {
  const fit = Math.min(
    (video.w * TIMELAPSE_ART_SHARE) / tile.w,
    (video.h * TIMELAPSE_ART_SHARE) / tile.h,
  );
  const scale = fit >= 1 ? Math.floor(fit) : fit;
  const w = Math.max(1, Math.round(tile.w * scale));
  const h = Math.max(1, Math.round(tile.h * scale));
  return {
    x: Math.round((video.w - w) / 2),
    y: Math.round((video.h - h) / 2),
    w,
    h,
  };
}
