import { GRID } from "./constants";
import type { Rect } from "./raster";

export type EncodedTile = {
  /** The grid the AI reads: size, rulers, one character per pixel, legend. */
  text: string;
  /** Character → #rrggbb for every colour in the grid. */
  palette: Record<string, string>;
};

const keyOf = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;
const hexOf = (key: number) => `#${key.toString(16).padStart(6, "0")}`;

function nearest(key: number, pool: number[]): number {
  const channel = (k: number, shift: number) => (k >> shift) & 255;
  let best = pool[0] ?? key;
  let bestDistance = Infinity;
  for (const k of pool) {
    const d =
      (channel(k, 16) - channel(key, 16)) ** 2 +
      (channel(k, 8) - channel(key, 8)) ** 2 +
      (channel(k, 0) - channel(key, 0)) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = k;
    }
  }
  return best;
}

/**
 * Writes `region` of the tile as a text grid. Coordinates on the rulers are
 * absolute tile coordinates, so the AI can answer with them directly. The
 * most common colours get a character each; rarer ones share the nearest.
 */
export function encodeTile(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  region: Rect,
): EncodedTile {
  const px = (x: number, y: number, c: number) =>
    pixels[(y * width + x) * 4 + c] ?? 0;

  const counts = new Map<number, number>();
  for (let y = region.y; y < region.y + region.h; y++) {
    for (let x = region.x; x < region.x + region.w; x++) {
      if (px(x, y, 3) < 128) continue;
      const k = keyOf(px(x, y, 0), px(x, y, 1), px(x, y, 2));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const kept = ranked.slice(0, GRID.alphabet.length);
  const charOf = new Map<number, string>();
  kept.forEach((k, i) => charOf.set(k, GRID.alphabet[i]!));
  for (const k of ranked.slice(kept.length)) {
    charOf.set(k, charOf.get(nearest(k, kept))!);
  }

  const lastX = region.x + region.w - 1;
  const lastY = region.y + region.h - 1;
  const gutter = String(lastY).length;
  const pad = " ".repeat(gutter + 2);
  const xs = Array.from({ length: region.w }, (_, i) => region.x + i);

  const lines = [`SIZE ${width}x${height}`];
  if (region.w !== width || region.h !== height) {
    lines.push(`REGION ${region.x},${region.y} ${region.w}x${region.h}`);
  }
  lines.push("");
  if (lastX >= 10) {
    lines.push(
      pad +
        xs
          .map((x) => (x >= 10 ? String(Math.floor(x / 10) % 10) : " "))
          .join(""),
    );
  }
  lines.push(pad + xs.map((x) => String(x % 10)).join(""));
  for (let y = region.y; y <= lastY; y++) {
    const row = xs
      .map((x) =>
        px(x, y, 3) < 128
          ? GRID.transparent
          : charOf.get(keyOf(px(x, y, 0), px(x, y, 1), px(x, y, 2)))!,
      )
      .join("");
    lines.push(`${String(y).padStart(gutter)}| ${row}`);
  }

  const palette: Record<string, string> = {};
  kept.forEach((k, i) => (palette[GRID.alphabet[i]!] = hexOf(k)));
  const legend = Object.entries(palette).map(([c, hex]) => `${c} ${hex}`);
  lines.push("", "COLORS (chars used in the grid)");
  for (let i = 0; i < legend.length; i += 4) {
    lines.push(legend.slice(i, i + 4).join("   "));
  }
  if (!legend.length) lines.push("(area is empty)");

  return { text: lines.join("\n"), palette };
}
