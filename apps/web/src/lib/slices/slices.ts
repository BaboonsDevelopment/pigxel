export type Rect = { x: number; y: number; w: number; h: number };

export type Slice = {
  id: string;
  name: string;
  bounds: Rect;
  center: Rect | null;
  pivot: { x: number; y: number } | null;
};

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

export function centerInset(bounds: Rect, border: number): Rect | null {
  const w = bounds.w - 2 * border;
  const h = bounds.h - 2 * border;
  return border > 0 && w > 0 && h > 0 ? { x: border, y: border, w, h } : null;
}

export const borderOf = (slice: Slice) => slice.center?.x ?? 0;

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

export function nextSliceName(slices: Slice[]) {
  const names = new Set(slices.map((s) => s.name));
  let n = slices.length + 1;
  while (names.has(`Slice ${n}`)) n++;
  return `Slice ${n}`;
}

export function sliceAt(slices: Slice[], x: number, y: number) {
  for (let i = slices.length - 1; i >= 0; i--) {
    const b = slices[i]!.bounds;
    if (x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h)
      return slices[i]!;
  }
  return null;
}

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
