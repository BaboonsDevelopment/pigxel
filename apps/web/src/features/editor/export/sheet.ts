import type { Bitmap, Size } from "@/lib/image/bitmap";
import type { Slice } from "@/lib/slices/slices";
import type { SheetLayout } from "./constants";

export function sheetGrid(count: number, layout: SheetLayout) {
  if (layout === "row") return { cols: count, rows: 1 };
  if (layout === "column") return { cols: 1, rows: count };
  const cols = Math.ceil(Math.sqrt(count));
  return { cols, rows: Math.ceil(count / cols) };
}

function sheetCell(n: number, cols: number, frame: Size) {
  return {
    x: (n % cols) * frame.w,
    y: Math.floor(n / cols) * frame.h,
    ...frame,
  };
}

export function sheetSize(count: number, layout: SheetLayout, frame: Size) {
  const { cols, rows } = sheetGrid(count, layout);
  return { w: cols * frame.w, h: rows * frame.h };
}

export function buildSheet(frames: Bitmap[], layout: SheetLayout): Bitmap {
  const frame = { w: frames[0]!.w, h: frames[0]!.h };
  const { cols } = sheetGrid(frames.length, layout);
  const { w, h } = sheetSize(frames.length, layout, frame);
  const rgba = new Uint8ClampedArray(w * h * 4);
  frames.forEach((image, n) => {
    const cell = sheetCell(n, cols, frame);
    for (let y = 0; y < frame.h; y++) {
      const from = y * frame.w * 4;
      rgba.set(
        image.rgba.subarray(from, from + frame.w * 4),
        ((cell.y + y) * w + cell.x) * 4,
      );
    }
  });
  return { rgba, w, h };
}

export function sheetData({
  name,
  image,
  durations,
  layout,
  frame,
  scale,
  slices = [],
}: {
  name: string;
  image: string;
  durations: number[];
  layout: SheetLayout;
  frame: Size;
  scale: number;
  slices?: Slice[];
}) {
  const scaled = <T extends Record<string, number>>(r: T) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v * scale])) as T;
  const { cols } = sheetGrid(durations.length, layout);
  const whole = { x: 0, y: 0, ...frame };
  return {
    frames: durations.map((duration, n) => ({
      filename: `${name} ${n}.png`,
      frame: sheetCell(n, cols, frame),
      rotated: false,
      trimmed: false,
      spriteSourceSize: whole,
      sourceSize: frame,
      duration,
    })),
    meta: {
      app: "Pigxel",
      version: "1.0",
      image,
      format: "RGBA8888",
      size: sheetSize(durations.length, layout, frame),
      scale: String(scale),
      frameTags: [],
      layers: [],
      slices: slices.map((slice) => ({
        name: slice.name,
        color: "#0000ffff",
        keys: [
          {
            frame: 0,
            bounds: scaled(slice.bounds),
            ...(slice.center && { center: scaled(slice.center) }),
            ...(slice.pivot && { pivot: scaled(slice.pivot) }),
          },
        ],
      })),
    },
  };
}
