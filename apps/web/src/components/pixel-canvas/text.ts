import {
  dotGothic16,
  pressStart2P,
  silkscreen,
  tiny5,
} from "@/lib/pixel-fonts";
import type { Rgba } from "./paint";
import type { Floating } from "./selection";

/** The fonts the text tool writes with. */
export type TextFont =
  "tiny5" | "dotGothic" | "pressStart" | "silkscreen" | "tiny";

/** Readable ones first; the heights are of a capital letter at 1×. */
export const TEXT_FONTS: { id: TextFont; label: string; title: string }[] = [
  {
    id: "tiny5",
    label: "Tiny5 · 5 px",
    title: "Small letters and capitals, Latin and Cyrillic: for 16–32 px tiles",
  },
  {
    id: "dotGothic",
    label: "DotGothic16 · 13 px",
    title: "Large and clear, Latin and Cyrillic: for 32 px tiles and up",
  },
  {
    id: "pressStart",
    label: "Press Start 2P · 7 px",
    title: "Bold arcade capitals, Latin and Cyrillic",
  },
  {
    id: "silkscreen",
    label: "Silkscreen · 5 px",
    title: "Capitals only, Latin letters",
  },
  {
    id: "tiny",
    label: "Tiny 3×5",
    title:
      "The smallest: capital letters, digits and signs in 3 × 5 pixels, Latin only",
  },
];

/** How many times bigger than its own pixel size the text is written. */
export const TEXT_SCALES = [1, 2, 3];

/**
 * The web pixel fonts, each with the size it is drawn at so its pixels land
 * on whole tile pixels (its em in font pixels).
 */
const WEB_FONTS: Record<
  Exclude<TextFont, "tiny">,
  { family: string; px: number }
> = {
  tiny5: { family: tiny5.style.fontFamily, px: 8 },
  dotGothic: { family: dotGothic16.style.fontFamily, px: 16 },
  pressStart: { family: pressStart2P.style.fontFamily, px: 8 },
  silkscreen: { family: silkscreen.style.fontFamily, px: 8 },
};

/**
 * The 3 × 5 font: five rows of three pixels per glyph, 1 drawn. Lowercase
 * letters use the capitals; glyphs narrower than 3 lose their empty columns.
 */
const TINY: Record<string, string> = {
  A: "010 101 111 101 101",
  B: "110 101 110 101 110",
  C: "011 100 100 100 011",
  D: "110 101 101 101 110",
  E: "111 100 110 100 111",
  F: "111 100 110 100 100",
  G: "011 100 101 101 011",
  H: "101 101 111 101 101",
  I: "111 010 010 010 111",
  J: "001 001 001 101 010",
  K: "101 101 110 101 101",
  L: "100 100 100 100 111",
  M: "101 111 111 101 101",
  N: "110 101 101 101 101",
  O: "010 101 101 101 010",
  P: "110 101 110 100 100",
  Q: "010 101 101 110 011",
  R: "110 101 110 101 101",
  S: "011 100 010 001 110",
  T: "111 010 010 010 010",
  U: "101 101 101 101 111",
  V: "101 101 101 101 010",
  W: "101 101 111 111 101",
  X: "101 101 010 101 101",
  Y: "101 101 010 010 010",
  Z: "111 001 010 100 111",
  "0": "111 101 101 101 111",
  "1": "010 110 010 010 111",
  "2": "110 001 010 100 111",
  "3": "110 001 010 001 110",
  "4": "101 101 111 001 001",
  "5": "111 100 110 001 110",
  "6": "011 100 111 101 111",
  "7": "111 001 010 010 010",
  "8": "111 101 111 101 111",
  "9": "111 101 111 001 110",
  ".": "000 000 000 000 010",
  ",": "000 000 000 010 100",
  "!": "010 010 010 000 010",
  "?": "110 001 010 000 010",
  ":": "000 010 000 010 000",
  ";": "000 010 000 010 100",
  "-": "000 000 111 000 000",
  "+": "000 010 111 010 000",
  "=": "000 111 000 111 000",
  "'": "010 010 000 000 000",
  '"': "101 101 000 000 000",
  "/": "001 001 010 100 100",
  "(": "001 010 010 010 001",
  ")": "100 010 010 010 100",
  "%": "101 001 010 100 101",
  "#": "101 111 101 111 101",
  "*": "101 010 101 000 000",
  _: "000 000 000 000 111",
  "<": "001 010 100 010 001",
  ">": "100 010 001 010 100",
};

type Bitmap = { w: number; h: number; on: Uint8Array };

/** The 3 × 5 glyph of `char` with its empty side columns dropped; null when there is none. */
function tinyGlyph(char: string): Bitmap | null {
  const rows = TINY[char.toUpperCase()]?.replaceAll(" ", "");
  if (!rows) return null;
  const cols = [0, 1, 2].filter((x) =>
    [0, 1, 2, 3, 4].some((y) => rows[y * 3 + x] === "1"),
  );
  const from = cols[0] ?? 0;
  const w = (cols.at(-1) ?? 0) - from + 1;
  const on = new Uint8Array(w * 5);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < w; x++)
      on[y * w + x] = rows[y * 3 + from + x] === "1" ? 1 : 0;
  return { w, h: 5, on };
}

/** `text` in the 3 × 5 font, a pixel apart; unknown characters leave a gap. */
function tinyText(text: string): Bitmap {
  const glyphs = [...text].map(
    (char) => tinyGlyph(char) ?? { w: 2, h: 5, on: new Uint8Array(10) },
  );
  const w = Math.max(0, glyphs.reduce((sum, g) => sum + g.w + 1, 0) - 1);
  const on = new Uint8Array(w * 5);
  let left = 0;
  for (const g of glyphs) {
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < g.w; x++) on[y * w + left + x] = g.on[y * g.w + x]!;
    left += g.w + 1;
  }
  return { w, h: 5, on };
}

/** `text` in a web pixel font, drawn at its own pixel size with no smoothing. */
async function webFontText(
  text: string,
  { family, px }: { family: string; px: number },
): Promise<Bitmap> {
  const font = `${px}px ${family}`;
  await document.fonts.load(font, text);
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d")!;
  measure.font = font;
  canvas.width = Math.max(1, Math.ceil(measure.measureText(text).width) + 2);
  canvas.height = px * 3;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.font = font;
  ctx.textBaseline = "top";
  ctx.fillText(text, 1, px);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const on = new Uint8Array(canvas.width * canvas.height);
  // Edge pixels the browser smoothed are kept only when mostly covered.
  for (let i = 0; i < on.length; i++) on[i] = data[i * 4 + 3]! >= 128 ? 1 : 0;
  return { w: canvas.width, h: canvas.height, on };
}

/** The bitmap cut to the box around its drawn pixels; null when nothing is drawn. */
function cropped(b: Bitmap): Bitmap | null {
  let [x0, y0, x1, y1] = [b.w, b.h, -1, -1];
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++)
      if (b.on[y * b.w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const on = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) on[y * w + x] = b.on[(y0 + y) * b.w + x0 + x]!;
  return { w, h, on };
}

/**
 * `text` written in `font`, `scale` times its pixel size, in `rgba`, as a
 * floating piece at (`x`, `y`); null when it draws nothing.
 */
export async function textPiece(
  text: string,
  font: TextFont,
  scale: number,
  rgba: Rgba,
  x: number,
  y: number,
): Promise<Floating | null> {
  // Settings saved before the text tool existed have no font or size:
  // Tiny5 at 1× stands in for them.
  const web =
    font === "tiny" ? undefined : (WEB_FONTS[font] ?? WEB_FONTS.tiny5);
  const k = TEXT_SCALES.includes(scale) ? scale : 1;
  const drawn = cropped(web ? await webFontText(text, web) : tinyText(text));
  if (!drawn) return null;
  const w = drawn.w * k;
  const h = drawn.h * k;
  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let py = 0; py < h; py++)
    for (let px = 0; px < w; px++)
      if (drawn.on[Math.floor(py / k) * drawn.w + Math.floor(px / k)])
        pixels.set(rgba, (py * w + px) * 4);
  return { x, y, w, h, pixels, mask: new Uint8Array(w * h).fill(1) };
}
