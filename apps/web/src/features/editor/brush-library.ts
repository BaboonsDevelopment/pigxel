import type { Stamp } from "./pixel-canvas/paint";

export type SavedBrush = { id: string; stamp: Stamp };

export const MAX_BRUSHES = 24;
export const MAX_BRUSH_SIDE = 128;

const brushesKey = (userId: string) => `pigxel:brushes:v1:${userId}`;

export const fitsLibrary = (stamp: Stamp) =>
  stamp.w <= MAX_BRUSH_SIDE && stamp.h <= MAX_BRUSH_SIDE;

export const sameStamp = (a: Stamp, b: Stamp) =>
  a.w === b.w &&
  a.h === b.h &&
  a.pixels.length === b.pixels.length &&
  a.pixels.every((v, i) => v === b.pixels[i]);

export function withBrush(
  brushes: SavedBrush[],
  stamp: Stamp,
  id: string,
): SavedBrush[] {
  if (!fitsLibrary(stamp) || brushes.some((b) => sameStamp(b.stamp, stamp)))
    return brushes;
  return [{ id, stamp }, ...brushes].slice(0, MAX_BRUSHES);
}

function encode(pixels: Uint8ClampedArray) {
  let text = "";
  for (const byte of pixels) text += String.fromCharCode(byte);
  return btoa(text);
}

function decode(text: string) {
  return Uint8ClampedArray.from(atob(text), (c) => c.charCodeAt(0));
}

export function readBrushes(
  userId: string,
  storage: Storage | undefined = browserStorage(),
): SavedBrush[] {
  try {
    const raw = JSON.parse(storage?.getItem(brushesKey(userId)) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((b) => {
      if (
        typeof b?.id !== "string" ||
        !Number.isInteger(b.w) ||
        !Number.isInteger(b.h) ||
        typeof b.pixels !== "string"
      )
        return [];
      const pixels = decode(b.pixels);
      return pixels.length === b.w * b.h * 4
        ? [{ id: b.id, stamp: { w: b.w, h: b.h, pixels } }]
        : [];
    });
  } catch {
    return [];
  }
}

export function writeBrushes(
  userId: string,
  brushes: SavedBrush[],
  storage: Storage | undefined = browserStorage(),
) {
  try {
    storage?.setItem(
      brushesKey(userId),
      JSON.stringify(
        brushes.map(({ id, stamp }) => ({
          id,
          w: stamp.w,
          h: stamp.h,
          pixels: encode(stamp.pixels),
        })),
      ),
    );
  } catch {}
}

function browserStorage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
