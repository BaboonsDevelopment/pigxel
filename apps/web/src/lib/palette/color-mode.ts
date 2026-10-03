/**
 * Colour modes, as Aseprite's Sprite › Color Mode:
 * - rgb: any colour.
 * - indexed: only the palette's colours. Every pixel is one of them, so
 *   changing a palette colour changes it everywhere on the tile.
 * - grayscale: only greys.
 * Pixels are kept as colours either way; in indexed and grayscale modes
 * anything drawn is brought into the mode when the change finishes.
 */
export type ColorMode = "rgb" | "indexed" | "grayscale";

export const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: "rgb", label: "RGB" },
  { value: "indexed", label: "Indexed (palette colours only)" },
  { value: "grayscale", label: "Grayscale" },
];

export function readColorMode(value: unknown): ColorMode {
  return value === "indexed" || value === "grayscale" ? value : "rgb";
}

type Rgb = readonly [number, number, number];

const rgbOf = (hex: string): Rgb => {
  const v = hex.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
};

/**
 * `rgba` with every pixel brought into `mode`, or null when nothing changes.
 * Indexed: each pixel becomes the nearest palette colour (fully opaque, or
 * clear when more than half see-through); `recolor` first turns given
 * colours into others, e.g. a palette colour that was changed. Grayscale:
 * each pixel becomes the grey of its brightness.
 */
export function inColorMode(
  rgba: Uint8ClampedArray,
  mode: ColorMode,
  palette: string[],
  recolor?: ReadonlyMap<string, string>,
): Uint8ClampedArray | null {
  if (mode === "rgb") return null;
  const out = new Uint8ClampedArray(rgba);
  let changed = false;
  const set = (i: number, r: number, g: number, b: number, a: number) => {
    if (
      out[i] !== r ||
      out[i + 1] !== g ||
      out[i + 2] !== b ||
      out[i + 3] !== a
    )
      changed = true;
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = a;
  };
  if (mode === "grayscale") {
    for (let i = 0; i < out.length; i += 4) {
      const grey = Math.round(
        0.299 * out[i]! + 0.587 * out[i + 1]! + 0.114 * out[i + 2]!,
      );
      set(i, grey, grey, grey, out[i + 3]!);
    }
    return changed ? out : null;
  }
  const colors = palette.map(rgbOf);
  if (!colors.length) return null;
  const swaps = new Map(
    [...(recolor ?? [])].map(([from, to]) => [packed(rgbOf(from)), rgbOf(to)]),
  );
  // Many pixels share a colour: each is matched once.
  const nearest = new Map<number, Rgb>();
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3]! < 128) {
      set(i, 0, 0, 0, 0);
      continue;
    }
    const key = packed([out[i]!, out[i + 1]!, out[i + 2]!]);
    let to = swaps.get(key) ?? nearest.get(key);
    if (!to) {
      to = nearestColor([out[i]!, out[i + 1]!, out[i + 2]!], colors);
      nearest.set(key, to);
    }
    set(i, to[0], to[1], to[2], 255);
  }
  return changed ? out : null;
}

const packed = ([r, g, b]: Rgb) => (r << 16) | (g << 8) | b;

function nearestColor(c: Rgb, colors: Rgb[]): Rgb {
  let best = colors[0]!;
  let bestDistance = Infinity;
  for (const p of colors) {
    // Weighted by how strongly the eye sees each channel.
    const d =
      2 * (c[0] - p[0]) ** 2 + 4 * (c[1] - p[1]) ** 2 + 3 * (c[2] - p[2]) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = p;
    }
  }
  return best;
}

/**
 * For a palette loaded over another on an indexed tile: each old colour
 * turns into the new colour in its place, as Aseprite does, so a night
 * palette of the same layout turns a day tile into night.
 */
export function recolorByPlace(
  before: string[],
  after: string[],
): Map<string, string> {
  const recolor = new Map<string, string>();
  before.forEach((from, i) => {
    const to = after[i];
    if (to && !recolor.has(from)) recolor.set(from, to);
  });
  return recolor;
}
