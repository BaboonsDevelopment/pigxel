import {
  TEXT_FONTS,
  TEXT_SCALES,
  isCustomFont,
  spacingOf,
  type TextFont,
} from "@/features/editor/pixel-canvas/text-fonts";
import type { Rgba } from "@/features/editor/pixel-canvas/paint";
import type { Floating } from "@/features/editor/pixel-canvas/selection";
import type { Size } from "@/features/editor/pixel-canvas/constants";
import { stampFloating } from "@/features/editor/pixel-canvas/selection";

export type LayerText = {
  value: string;
  font: TextFont;
  scale: number;
  letterSpacing?: number;
  lineSpacing?: number;
  rgba: Rgba;
  x: number;
  y: number;
};
export type InlineText = LayerText & {
  id: string;
  w: number;
  h: number;
  under: string;
  pixels: string;
};
const encode = (pixels: Uint8ClampedArray) => {
  let value = "";
  for (const byte of pixels) value += String.fromCharCode(byte);
  return btoa(value);
};
const decode = (value: string) =>
  Uint8ClampedArray.from(atob(value), (char) => char.charCodeAt(0));

export function readTextObjects(
  raw: unknown,
): Record<string, InlineText[]> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const result: Record<string, InlineText[]> = {};
  for (const [frame, entries] of Object.entries(raw)) {
    if (!Array.isArray(entries)) continue;
    const kept = entries.flatMap((entry) => {
      const metadata = readLayerTexts({ frame: entry })?.frame;
      if (
        !metadata ||
        typeof entry.id !== "string" ||
        !Number.isInteger(entry.w) ||
        !Number.isInteger(entry.h) ||
        entry.w <= 0 ||
        entry.h <= 0 ||
        entry.w * entry.h > 4000000 ||
        typeof entry.under !== "string" ||
        typeof entry.pixels !== "string"
      )
        return [];
      try {
        if (
          decode(entry.under).length !== entry.w * entry.h * 4 ||
          decode(entry.pixels).length !== entry.w * entry.h * 4
        )
          return [];
      } catch {
        return [];
      }
      return [
        {
          ...metadata,
          id: entry.id,
          w: entry.w,
          h: entry.h,
          under: entry.under,
          pixels: entry.pixels,
        },
      ];
    });
    if (kept.length) result[frame] = kept;
  }
  return Object.keys(result).length ? result : undefined;
}

export function matchesInlineText(
  text: InlineText,
  cel: Uint8ClampedArray,
  size: Size,
): boolean {
  const pixels = decode(text.pixels);
  for (let y = 0; y < text.h; y++)
    for (let x = 0; x < text.w; x++) {
      const i = (y * text.w + x) * 4,
        dx = text.x + x,
        dy = text.y + y;
      if (!pixels[i + 3] || dx < 0 || dy < 0 || dx >= size.w || dy >= size.h)
        continue;
      const target = (dy * size.w + dx) * 4;
      for (let channel = 0; channel < 4; channel++)
        if (pixels[i + channel] !== cel[target + channel]) return false;
    }
  return true;
}

export function replaceInlineText(
  cel: Uint8ClampedArray,
  size: Size,
  piece: Floating,
  text: LayerText,
  previous?: InlineText,
) {
  const background = new Uint8ClampedArray(cel);
  if (previous) {
    const pixels = decode(previous.pixels),
      under = decode(previous.under);
    for (let y = 0; y < previous.h; y++)
      for (let x = 0; x < previous.w; x++) {
        const i = (y * previous.w + x) * 4,
          dx = previous.x + x,
          dy = previous.y + y;
        const target = (dy * size.w + dx) * 4;
        const unchanged = [0, 1, 2, 3].every(
          (channel) => pixels[i + channel] === cel[target + channel],
        );
        if (
          unchanged &&
          pixels[i + 3] &&
          dx >= 0 &&
          dy >= 0 &&
          dx < size.w &&
          dy < size.h
        )
          background.set(under.subarray(i, i + 4), (dy * size.w + dx) * 4);
      }
  }
  const under = new Uint8ClampedArray(piece.w * piece.h * 4);
  for (let y = 0; y < piece.h; y++)
    for (let x = 0; x < piece.w; x++) {
      const dx = piece.x + x,
        dy = piece.y + y;
      if (dx >= 0 && dy >= 0 && dx < size.w && dy < size.h)
        under.set(
          background.subarray(
            (dy * size.w + dx) * 4,
            (dy * size.w + dx) * 4 + 4,
          ),
          (y * piece.w + x) * 4,
        );
    }
  const record: InlineText = {
    ...text,
    id: previous?.id ?? crypto.randomUUID(),
    w: piece.w,
    h: piece.h,
    under: encode(under),
    pixels: encode(piece.pixels),
  };
  return { pixels: stampFloating(background, size, piece), record };
}
export function readLayerTexts(
  raw: unknown,
): Record<string, LayerText> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, LayerText> = {};
  for (const [frame, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    if (
      typeof v.value !== "string" ||
      v.value.length > 10000 ||
      (!TEXT_FONTS.some((font) => font.id === v.font) &&
        !isCustomFont(v.font)) ||
      !TEXT_SCALES.includes(v.scale as number) ||
      !Number.isInteger(v.x) ||
      !Number.isInteger(v.y) ||
      !Array.isArray(v.rgba) ||
      v.rgba.length !== 4 ||
      !v.rgba.every(
        (channel) =>
          Number.isInteger(channel) && channel >= 0 && channel <= 255,
      )
    )
      continue;
    const spacing = spacingOf(
      v.letterSpacing as number | undefined,
      v.lineSpacing as number | undefined,
    );
    out[frame] = {
      value: v.value,
      font: v.font as TextFont,
      scale: v.scale as number,
      ...(spacing.letter && { letterSpacing: spacing.letter }),
      ...(spacing.line && { lineSpacing: spacing.line }),
      rgba: [v.rgba[0], v.rgba[1], v.rgba[2], v.rgba[3]],
      x: v.x as number,
      y: v.y as number,
    };
  }
  return Object.keys(out).length ? out : undefined;
}

export function textCel(piece: Floating, size: Size): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(size.w * size.h * 4);
  for (let y = 0; y < piece.h; y++)
    for (let x = 0; x < piece.w; x++) {
      const dx = piece.x + x,
        dy = piece.y + y;
      if (dx < 0 || dy < 0 || dx >= size.w || dy >= size.h) continue;
      pixels.set(
        piece.pixels.subarray((y * piece.w + x) * 4, (y * piece.w + x) * 4 + 4),
        (dy * size.w + dx) * 4,
      );
    }
  return pixels;
}

// Accept a translated text layer, but never replace unrelated raster edits.
export function locateText(
  piece: Floating,
  pixels: Uint8ClampedArray,
  size: Size,
): { x: number; y: number } | null {
  const matches = (x: number, y: number) => {
    const expected = textCel({ ...piece, x, y }, size);
    return expected.every((value, i) => value === pixels[i]);
  };
  if (matches(piece.x, piece.y)) return { x: piece.x, y: piece.y };
  let x = size.w,
    y = size.h;
  for (let i = 0; i < size.w * size.h; i++)
    if (pixels[i * 4 + 3]) {
      x = Math.min(x, i % size.w);
      y = Math.min(y, Math.floor(i / size.w));
    }
  return x < size.w && y < size.h && matches(x, y) ? { x, y } : null;
}
