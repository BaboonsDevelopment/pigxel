import { resizeNearest, type Bitmap, type Size } from "@/lib/image/bitmap";
import type { Slice } from "@/lib/slices/slices";
import type { FrameTag } from "@/lib/sprite/tags";
import type { SheetJson, SheetLayout } from "./constants";

type Rect = { x: number; y: number; w: number; h: number };

export type SheetItem = {
  name: string;
  image: Bitmap;
  duration: number;
  group: number;
};

export type SheetOptions = {
  layout: SheetLayout;
  border: number;
  spacing: number;
  inner: number;
  trim: boolean;
  merge: boolean;
  skipEmpty: boolean;
};

export const PLAIN_SHEET: SheetOptions = {
  layout: "row",
  border: 0,
  spacing: 0,
  inner: 0,
  trim: false,
  merge: false,
  skipEmpty: false,
};

type PlacedFrame = {
  item: SheetItem;
  frame: Rect;
  source: Rect;
  sourceSize: Size;
  trimmed: boolean;
};

export function sheetGrid(count: number, layout: SheetLayout) {
  if (layout === "row") return { cols: count, rows: 1 };
  if (layout === "column") return { cols: 1, rows: count };
  const cols = Math.ceil(Math.sqrt(count));
  return { cols, rows: Math.ceil(count / cols) };
}

function drawnBounds({ rgba, w, h }: Bitmap): Rect | null {
  let left = w;
  let top = h;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (rgba[(y * w + x) * 4 + 3]) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  return right < 0
    ? null
    : { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

function cut({ rgba, w }: Bitmap, area: Rect): Bitmap {
  const out = new Uint8ClampedArray(area.w * area.h * 4);
  for (let y = 0; y < area.h; y++) {
    const from = ((area.y + y) * w + area.x) * 4;
    out.set(rgba.subarray(from, from + area.w * 4), y * area.w * 4);
  }
  return { rgba: out, w: area.w, h: area.h };
}

const keyOf = ({ rgba, w, h }: Bitmap) => {
  let key = `${w}x${h}:`;
  for (let i = 0; i < rgba.length; i += 4096)
    key += String.fromCharCode(...rgba.subarray(i, i + 4096));
  return key;
};

type Cell = {
  image: Bitmap;
  size: Size;
  at: { x: number; y: number };
  group: number;
};

function place(cells: Cell[], options: SheetOptions): Size {
  const { layout, border, spacing, inner } = options;
  const outer = (c: Cell) => ({
    w: c.size.w + inner * 2,
    h: c.size.h + inner * 2,
  });
  if (!cells.length) return { w: border * 2 || 1, h: border * 2 || 1 };
  let w = 0;
  let h = 0;
  const grow = (x: number, y: number, size: Size) => {
    w = Math.max(w, x + size.w);
    h = Math.max(h, y + size.h);
  };

  if (layout === "grid") {
    const { cols } = sheetGrid(cells.length, "grid");
    const cw = Math.max(...cells.map((c) => outer(c).w));
    const ch = Math.max(...cells.map((c) => outer(c).h));
    cells.forEach((cell, n) => {
      const x = border + (n % cols) * (cw + spacing);
      const y = border + Math.floor(n / cols) * (ch + spacing);
      cell.at = { x: x + inner, y: y + inner };
      grow(x, y, { w: cw, h: ch });
    });
  } else if (layout === "packed") {
    const area = cells.reduce((sum, c) => {
      const size = outer(c);
      return sum + (size.w + spacing) * (size.h + spacing);
    }, 0);
    const widest = Math.max(...cells.map((c) => outer(c).w));
    const limit = Math.max(widest, Math.ceil(Math.sqrt(area)));
    const order = [...cells].sort((a, b) => outer(b).h - outer(a).h);
    let x = border;
    let y = border;
    let shelf = 0;
    for (const cell of order) {
      const size = outer(cell);
      if (x > border && x - border + size.w > limit) {
        x = border;
        y += shelf + spacing;
        shelf = 0;
      }
      cell.at = { x: x + inner, y: y + inner };
      grow(x, y, size);
      x += size.w + spacing;
      shelf = Math.max(shelf, size.h);
    }
  } else {
    const across = layout === "row";
    let lane = border;
    let along = border;
    let thickness = 0;
    let group = cells[0]!.group;
    for (const cell of cells) {
      const size = outer(cell);
      if (cell.group !== group) {
        group = cell.group;
        lane += thickness + spacing;
        along = border;
        thickness = 0;
      }
      const x = across ? along : lane;
      const y = across ? lane : along;
      cell.at = { x: x + inner, y: y + inner };
      grow(x, y, size);
      along += (across ? size.w : size.h) + spacing;
      thickness = Math.max(thickness, across ? size.h : size.w);
    }
  }
  return { w: w + border, h: h + border };
}

function planSheet(items: SheetItem[], options: SheetOptions, scale: number) {
  const cells: Cell[] = [];
  const merged = new Map<string, Cell>();
  const uses: {
    item: SheetItem;
    cell: Cell;
    source: Rect;
    trimmed: boolean;
  }[] = [];
  for (const item of items) {
    const whole = { x: 0, y: 0, w: item.image.w, h: item.image.h };
    const bounds = drawnBounds(item.image);
    if (!bounds && options.skipEmpty) continue;
    const source = options.trim
      ? (bounds ?? { x: 0, y: 0, w: 1, h: 1 })
      : whole;
    const image = source === whole ? item.image : cut(item.image, source);
    const key = options.merge ? keyOf(image) : "";
    let cell = options.merge ? merged.get(key) : undefined;
    if (!cell) {
      cell = {
        image,
        size: { w: image.w * scale, h: image.h * scale },
        at: { x: 0, y: 0 },
        group: item.group,
      };
      cells.push(cell);
      if (options.merge) merged.set(key, cell);
    }
    uses.push({
      item,
      cell,
      source,
      trimmed: source.w !== whole.w || source.h !== whole.h,
    });
  }
  return { cells, uses, size: place(cells, options) };
}

export const sheetSize = (
  items: SheetItem[],
  options: SheetOptions,
  scale: number,
): Size => planSheet(items, options, scale).size;

export function packSheet(
  items: SheetItem[],
  options: SheetOptions,
  scale: number,
): { image: Bitmap; frames: PlacedFrame[] } {
  const { cells, uses, size } = planSheet(items, options, scale);
  const rgba = new Uint8ClampedArray(size.w * size.h * 4);
  for (const { image, size: cell, at } of cells) {
    const big = scale === 1 ? image : resizeNearest(image, cell.w, cell.h);
    for (let y = 0; y < cell.h; y++)
      rgba.set(
        big.rgba.subarray(y * cell.w * 4, (y + 1) * cell.w * 4),
        ((at.y + y) * size.w + at.x) * 4,
      );
  }
  const times = (r: Rect) => ({
    x: r.x * scale,
    y: r.y * scale,
    w: r.w * scale,
    h: r.h * scale,
  });
  return {
    image: { rgba, ...size },
    frames: uses.map(({ item, cell, source, trimmed }) => ({
      item,
      frame: { ...cell.at, ...cell.size },
      source: times(source),
      sourceSize: { w: item.image.w * scale, h: item.image.h * scale },
      trimmed,
    })),
  };
}

export function sheetData({
  image,
  size,
  frames,
  json,
  scale,
  slices = [],
  tags = [],
}: {
  image: string;
  size: Size;
  frames: PlacedFrame[];
  json: SheetJson;
  scale: number;
  slices?: Slice[];
  tags?: FrameTag[];
}) {
  const scaled = <T extends Record<string, number>>(r: T) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v * scale])) as T;
  const entries = frames.map(
    ({ item, frame, source, sourceSize, trimmed }) => ({
      filename: item.name,
      frame,
      rotated: false,
      trimmed,
      spriteSourceSize: source,
      sourceSize,
      duration: item.duration,
    }),
  );
  return {
    frames:
      json === "hash"
        ? Object.fromEntries(
            entries.map(({ filename, ...entry }) => [filename, entry]),
          )
        : entries,
    meta: {
      app: "Pigxel",
      version: "1.0",
      image,
      format: "RGBA8888",
      size,
      scale: String(scale),
      frameTags: tags.map((tag) => ({
        name: tag.name,
        from: tag.from,
        to: tag.to,
        direction: tag.direction,
        color: `${tag.color}ff`,
        repeat: tag.repeat,
      })),
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
