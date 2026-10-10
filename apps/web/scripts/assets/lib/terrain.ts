import type { SliceDef } from "./asset.ts";
import { put, random, sprite, type Color, type Sprite } from "./sprite.ts";

const TILE = 16;

/** A colour for every pixel of a 16×16 tile, given the animation frame. */
export type Texture = (x: number, y: number, frame: number) => Color | null;

/** Precomputes a seamless 16×16 pattern so textures tile cleanly. */
export function pattern(
  seed: number,
  draw: (
    put: (x: number, y: number, c: Color) => void,
    rand: () => number,
  ) => void,
) {
  const cells = new Map<number, Color>();
  const rand = random(seed);
  draw(
    (x, y, c) =>
      cells.set(
        (((y % TILE) + TILE) % TILE) * TILE + (((x % TILE) + TILE) % TILE),
        c,
      ),
    rand,
  );
  return (x: number, y: number) =>
    cells.get(
      (((y % TILE) + TILE) % TILE) * TILE + (((x % TILE) + TILE) % TILE),
    ) ?? null;
}

export function textured(
  base: Color,
  overlay: (x: number, y: number) => Color | null,
): Texture {
  return (x, y) => overlay(x, y) ?? base;
}

export function tile(texture: Texture, frame = 0): Sprite {
  const s = sprite(TILE, TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) put(s, x, y, texture(x, y, frame));
  return s;
}

/** Edge that wobbles but repeats every tile, so neighbouring tiles line up. */
const wobble = (t: number, phase: number) =>
  Math.round(
    Math.sin(((t + phase) / TILE) * Math.PI * 2) * 0.7 +
      Math.sin(((t + phase) / TILE) * Math.PI * 4) * 0.6,
  );

type Side = "top" | "left" | "bottom" | "right";
type Notch = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type TileShape = {
  name: string;
  col: number;
  row: number;
  open?: Side[];
  notch?: Notch;
};

/** Classic 13-tile autotile: 3×3 block plus four inner corners, laid out 5×3. */
const AUTOTILE_13: TileShape[] = [
  { name: "top-left", col: 0, row: 0, open: ["top", "left"] },
  { name: "top", col: 1, row: 0, open: ["top"] },
  { name: "top-right", col: 2, row: 0, open: ["top", "right"] },
  { name: "left", col: 0, row: 1, open: ["left"] },
  { name: "centre", col: 1, row: 1, open: [] },
  { name: "right", col: 2, row: 1, open: ["right"] },
  { name: "bottom-left", col: 0, row: 2, open: ["bottom", "left"] },
  { name: "bottom", col: 1, row: 2, open: ["bottom"] },
  { name: "bottom-right", col: 2, row: 2, open: ["bottom", "right"] },
  { name: "inner top-left", col: 3, row: 0, notch: "top-left" },
  { name: "inner top-right", col: 4, row: 0, notch: "top-right" },
  { name: "inner bottom-left", col: 3, row: 1, notch: "bottom-left" },
  { name: "inner bottom-right", col: 4, row: 1, notch: "bottom-right" },
];

type AutotileStyle = {
  inside: Texture;
  outside: Texture;
  /** Inside pixels touching the outside. */
  edgeInside?: Texture;
  /** Outside pixels touching the inside. */
  edgeOutside?: Texture;
  margin?: number;
  radius?: number;
};

function insideOf(shape: TileShape, margin: number, radius: number) {
  const top = (x: number) => margin + wobble(x, 0);
  const left = (y: number) => margin + wobble(y, 5);
  const bottom = (x: number) => TILE - 1 - margin - wobble(x, 9);
  const right = (y: number) => TILE - 1 - margin - wobble(y, 3);
  const r = radius;
  return (x: number, y: number) => {
    if (shape.notch) {
      const [v, h] = shape.notch.split("-") as [
        "top" | "bottom",
        "left" | "right",
      ];
      const inV = v === "top" ? y < top(x) : y > bottom(x);
      const inH = h === "left" ? x < left(y) : x > right(y);
      if (!(inV && inH)) return true;
      const cx = h === "left" ? margin - 1 - r : TILE - margin + r;
      const cy = v === "top" ? margin - 1 - r : TILE - margin + r;
      const nearX = h === "left" ? x > cx : x < cx;
      const nearY = v === "top" ? y > cy : y < cy;
      return nearX && nearY && Math.hypot(x - cx, y - cy) > r + 0.5;
    }
    const open = new Set(shape.open);
    if (open.has("top") && y < top(x)) return false;
    if (open.has("bottom") && y > bottom(x)) return false;
    if (open.has("left") && x < left(y)) return false;
    if (open.has("right") && x > right(y)) return false;
    for (const v of ["top", "bottom"] as const)
      for (const h of ["left", "right"] as const) {
        if (!open.has(v) || !open.has(h)) continue;
        const cx = h === "left" ? margin + r : TILE - 1 - margin - r;
        const cy = v === "top" ? margin + r : TILE - 1 - margin - r;
        const nearX = h === "left" ? x < cx : x > cx;
        const nearY = v === "top" ? y < cy : y > cy;
        if (nearX && nearY && Math.hypot(x - cx, y - cy) > r + 0.5)
          return false;
      }
    return true;
  };
}

function autotileShape(
  shape: TileShape,
  style: AutotileStyle,
  frame = 0,
): Sprite {
  const inside = insideOf(shape, style.margin ?? 4, style.radius ?? 3);
  const s = sprite(TILE, TILE);
  const touches = (x: number, y: number, want: boolean) =>
    [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ].some(([dx, dy]) => inside(x + dx!, y + dy!) === want);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const isIn = inside(x, y);
      const edge = touches(x, y, !isIn);
      const texture = isIn
        ? (edge && style.edgeInside) || style.inside
        : (edge && style.edgeOutside) || style.outside;
      put(s, x, y, texture(x, y, frame));
    }
  return s;
}

/** The 13-tile set as one 80×48 sheet per frame, with a slice per tile. */
export function autotile13(style: AutotileStyle, frames = 1) {
  const sheets = Array.from({ length: frames }, (_, frame) => {
    const sheet = sprite(TILE * 5, TILE * 3);
    for (const shape of AUTOTILE_13) {
      const t = autotileShape(shape, style, frame);
      for (let y = 0; y < TILE; y++)
        sheet.data.set(
          t.data.subarray(y * TILE * 4, (y + 1) * TILE * 4),
          ((shape.row * TILE + y) * sheet.w + shape.col * TILE) * 4,
        );
    }
    return sheet;
  });
  const slices: SliceDef[] = AUTOTILE_13.map((shape) => ({
    name: shape.name,
    x: shape.col * TILE,
    y: shape.row * TILE,
    w: TILE,
    h: TILE,
  }));
  return { sheets, slices };
}
