export type Color = string;

export type Sprite = { w: number; h: number; data: Uint8ClampedArray };

const rgbaCache = new Map<Color, [number, number, number, number]>();

function rgba(color: Color): [number, number, number, number] {
  let value = rgbaCache.get(color);
  if (!value) {
    const hex = color.replace("#", "");
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    value = [n(0), n(2), n(4), hex.length === 8 ? n(6) : 255];
    rgbaCache.set(color, value);
  }
  return value;
}

export function sprite(w: number, h: number): Sprite {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) };
}

function clone(s: Sprite): Sprite {
  return { w: s.w, h: s.h, data: new Uint8ClampedArray(s.data) };
}

const inside = (s: Sprite, x: number, y: number) =>
  x >= 0 && y >= 0 && x < s.w && y < s.h;

export const filled = (s: Sprite, x: number, y: number) =>
  inside(s, x, y) && s.data[(y * s.w + x) * 4 + 3]! > 0;

export function colorAt(s: Sprite, x: number, y: number): Color | null {
  if (!filled(s, x, y)) return null;
  const i = (y * s.w + x) * 4;
  return (
    "#" +
    [0, 1, 2].map((c) => s.data[i + c]!.toString(16).padStart(2, "0")).join("")
  );
}

export function put(s: Sprite, x: number, y: number, color: Color | null) {
  x = Math.round(x);
  y = Math.round(y);
  if (!inside(s, x, y)) return;
  s.data.set(color ? rgba(color) : [0, 0, 0, 0], (y * s.w + x) * 4);
}

export function rect(
  s: Sprite,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Color | null,
) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) put(s, i, j, color);
}

export function line(
  s: Sprite,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Color | null,
) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    put(s, x0, y0, color);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Filled ellipse centred on a pixel grid point (cx, cy may be .5). */
export function ellipse(
  s: Sprite,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: Color | null,
) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / (rx + 0.5);
      const ny = (y - cy) / (ry + 0.5);
      if (nx * nx + ny * ny <= 1) put(s, x, y, color);
    }
}

export function disc(
  s: Sprite,
  cx: number,
  cy: number,
  r: number,
  color: Color | null,
) {
  ellipse(s, cx, cy, r, r, color);
}

export function ring(
  s: Sprite,
  cx: number,
  cy: number,
  r: number,
  color: Color,
) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r + 0.5 && d > r - 0.5) put(s, x, y, color);
    }
}

/** Fills the pixels whose centres fall inside the polygon (even–odd rule). */
export function polygon(
  s: Sprite,
  points: [number, number][],
  color: Color | null,
) {
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let hit = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i]!;
        const [xj, yj] = points[j]!;
        if (
          yi > py !== yj > py &&
          px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
        )
          hit = !hit;
      }
      if (hit) put(s, x, y, color);
    }
}

/** Recolours the filled pixels where `where(x, y)` holds. */
export function paint(
  s: Sprite,
  color: Color,
  where: (x: number, y: number) => boolean,
) {
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++)
      if (filled(s, x, y) && where(x, y)) put(s, x, y, color);
  return s;
}

/** Draws pixel art written as rows of characters; "." is clear. */
export function art(text: string, colors: Record<string, Color>): Sprite {
  const rows = text
    .trim()
    .split("\n")
    .map((row) => row.trim());
  const w = Math.max(...rows.map((row) => row.length));
  const s = sprite(w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const key = row[x]!;
      if (key === ".") continue;
      const color = colors[key];
      if (!color) throw new Error(`No colour for "${key}" in:\n${text}`);
      put(s, x, y, color);
    }
  });
  return s;
}

export function stamp(dst: Sprite, src: Sprite, x = 0, y = 0) {
  for (let j = 0; j < src.h; j++)
    for (let i = 0; i < src.w; i++)
      if (filled(src, i, j)) {
        const to = ((y + j) * dst.w + (x + i)) * 4;
        if (inside(dst, x + i, y + j))
          dst.data.set(
            src.data.subarray((j * src.w + i) * 4, (j * src.w + i) * 4 + 4),
            to,
          );
      }
  return dst;
}

export function compose(
  w: number,
  h: number,
  ...layers: [Sprite, number?, number?][]
) {
  const s = sprite(w, h);
  for (const [layer, x, y] of layers) stamp(s, layer, x, y);
  return s;
}

export function shift(s: Sprite, dx: number, dy: number): Sprite {
  return stamp(sprite(s.w, s.h), s, dx, dy);
}

export function recolor(s: Sprite, map: Record<Color, Color | null>): Sprite {
  const out = clone(s);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const color = colorAt(s, x, y);
      if (color && color in map) put(out, x, y, map[color]!);
    }
  return out;
}

/** Adds a 1px outline on every clear pixel touching the shape. */
export function outline(s: Sprite, color: Color, corners = false): Sprite {
  const out = clone(s);
  const around = corners
    ? [
        [-1, -1],
        [0, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
      ]
    : [
        [0, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ];
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++)
      if (
        !filled(s, x, y) &&
        around.some(([dx, dy]) => filled(s, x + dx!, y + dy!))
      )
        put(out, x, y, color);
  return out;
}

/** Deterministic random numbers in [0, 1). */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function times<T>(n: number, make: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => make(i));
}
