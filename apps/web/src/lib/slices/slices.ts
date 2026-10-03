/** A rectangle in tile pixels. */
export type Rect = { x: number; y: number; w: number; h: number };

/**
 * A named part of the tile, as Aseprite's slices: exported as its own
 * picture and listed in sprite sheet data for game engines. The same in
 * every frame.
 */
export type Slice = {
  id: string;
  /** Also the file name its picture is exported under. */
  name: string;
  /** Where it is on the tile. */
  bounds: Rect;
  /**
   * The 9-slice centre, relative to `bounds`: when a game stretches the
   * slice, the corners outside it keep their size and only this part grows.
   */
  center: Rect | null;
  /** The point a game places the slice by, relative to `bounds`. */
  pivot: { x: number; y: number } | null;
};

/** Pivot points the editor offers, relative to a slice of `w × h`. */
export const PIVOTS = [
  { id: "none", label: "None", at: null },
  { id: "top-left", label: "Top left", at: () => ({ x: 0, y: 0 }) },
  {
    id: "center",
    label: "Centre",
    at: (w: number, h: number) => ({
      x: Math.floor(w / 2),
      y: Math.floor(h / 2),
    }),
  },
  {
    id: "bottom",
    label: "Bottom centre",
    at: (w: number, h: number) => ({ x: Math.floor(w / 2), y: h - 1 }),
  },
] as const;

type PivotId = (typeof PIVOTS)[number]["id"];

/** Which of the offered pivots a slice has; "none" when it has another one. */
export function pivotIdOf(slice: Slice): PivotId {
  const { w, h } = slice.bounds;
  const found = PIVOTS.find((p) => {
    const at = p.at?.(w, h) ?? null;
    return at && slice.pivot
      ? at.x === slice.pivot.x && at.y === slice.pivot.y
      : at === slice.pivot;
  });
  return found?.id ?? "none";
}

/** The 9-slice centre `border` pixels in from every edge, or null when there is no room. */
export function centerInset(bounds: Rect, border: number): Rect | null {
  const w = bounds.w - 2 * border;
  const h = bounds.h - 2 * border;
  return border > 0 && w > 0 && h > 0 ? { x: border, y: border, w, h } : null;
}

/** How far in from the left edge a slice's 9-slice centre starts; 0 without one. */
export const borderOf = (slice: Slice) => slice.center?.x ?? 0;

/**
 * `slice` moved to new `bounds`: its 9-slice border and offered pivot stay
 * as they were (the centre goes when there is no room left for it); any
 * other pivot is kept where it is.
 */
export function resizedSlice(slice: Slice, bounds: Rect): Slice {
  const pivot = PIVOTS.find((p) => p.id === pivotIdOf(slice));
  return {
    ...slice,
    bounds,
    center: slice.center ? centerInset(bounds, borderOf(slice)) : null,
    pivot:
      slice.pivot && pivot?.at ? pivot.at(bounds.w, bounds.h) : slice.pivot,
  };
}

/** "Slice 1", "Slice 2", …: the first name no slice has yet. */
export function nextSliceName(slices: Slice[]) {
  const names = new Set(slices.map((s) => s.name));
  let n = slices.length + 1;
  while (names.has(`Slice ${n}`)) n++;
  return `Slice ${n}`;
}

/** The slice under a tile pixel: the one drawn last, as it shows on top. */
export function sliceAt(slices: Slice[], x: number, y: number) {
  for (let i = slices.length - 1; i >= 0; i--) {
    const b = slices[i]!.bounds;
    if (x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h)
      return slices[i]!;
  }
  return null;
}

/** The part of `bounds` on a tile of `w × h`, or null when none of it is. */
export function clipToTile(bounds: Rect, w: number, h: number): Rect | null {
  const x = Math.max(0, bounds.x);
  const y = Math.max(0, bounds.y);
  const right = Math.min(w, bounds.x + bounds.w);
  const bottom = Math.min(h, bounds.y + bounds.h);
  return right > x && bottom > y ? { x, y, w: right - x, h: bottom - y } : null;
}

const isInt = (v: unknown): v is number => Number.isInteger(v);

function readRect(value: unknown): Rect | null {
  if (typeof value !== "object" || value === null) return null;
  const { x, y, w, h } = value as Record<string, unknown>;
  return isInt(x) && isInt(y) && isInt(w) && isInt(h) && w > 0 && h > 0
    ? { x, y, w, h }
    : null;
}

/**
 * Slices from a .pigxel file: those without a usable name or bounds are left
 * out, and a centre or pivot outside its slice is dropped.
 */
export function readSlices(list: unknown): Slice[] {
  if (!Array.isArray(list)) return [];
  const ids = new Set<string>();
  return list.flatMap((entry): Slice[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const e = entry as Record<string, unknown>;
    const bounds = readRect(e.bounds);
    if (!bounds || typeof e.name !== "string" || !e.name.trim()) return [];
    const id =
      typeof e.id === "string" && e.id && !ids.has(e.id)
        ? e.id
        : crypto.randomUUID();
    ids.add(id);
    const center = readRect(e.center);
    const pivot = e.pivot as Record<string, unknown> | null | undefined;
    return [
      {
        id,
        name: e.name.slice(0, 100),
        bounds,
        center:
          center &&
          center.x + center.w <= bounds.w &&
          center.y + center.h <= bounds.h &&
          center.x >= 0 &&
          center.y >= 0
            ? center
            : null,
        pivot:
          pivot && isInt(pivot.x) && isInt(pivot.y)
            ? { x: pivot.x, y: pivot.y }
            : null,
      },
    ];
  });
}
