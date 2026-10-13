import type { AssetDef } from "./asset.ts";
import type { Issue, PackSource } from "./source.ts";
import { colorAt, filled, type Sprite } from "./sprite.ts";

/**
 * Rules a drawing must pass before it can be approved. Errors block it;
 * warnings point at what usually looks wrong, for the reviewer to judge.
 */

const OUTLINED_SHARE = 0.75;
const MIN_CANVAS_SHARE = 0.2;
const MIN_SHADES = 3;
const DARK = 0.3;

function luma(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255;
}

const NEIGHBOURS_4 = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const;
const NEIGHBOURS_8 = [
  ...NEIGHBOURS_4,
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

function each(s: Sprite, visit: (x: number, y: number) => void) {
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) visit(x, y);
}

const sameFrame = (a: Sprite, b: Sprite) =>
  a.data.every((value, i) => value === b.data[i]);

function bounds(frames: Sprite[]) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
  for (const s of frames)
    each(s, (x, y) => {
      if (!filled(s, x, y)) return;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    });
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** How much brightness changes, on average, between two columns or rows. */
function lineDiff(s: Sprite, a: number, b: number, vertical: boolean) {
  const n = vertical ? s.h : s.w;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const ca = vertical ? colorAt(s, a, i) : colorAt(s, i, a);
    const cb = vertical ? colorAt(s, b, i) : colorAt(s, i, b);
    sum += Math.abs(luma(ca ?? "#000000") - luma(cb ?? "#000000"));
  }
  return sum / n;
}

function seams(s: Sprite, vertical: boolean) {
  const n = vertical ? s.w : s.h;
  let inner = 0;
  for (let i = 0; i < n - 1; i++) inner += lineDiff(s, i, i + 1, vertical);
  inner /= n - 1;
  const seam = lineDiff(s, n - 1, 0, vertical);
  return seam > inner * 2 + 0.06;
}

const at = (frame: number, x: number, y: number) =>
  `frame ${frame + 1} (${x},${y})`;

export function checkAsset(asset: AssetDef, pack: PackSource): Issue[] {
  const issues: Issue[] = [];
  const error = (rule: string, message: string) =>
    issues.push({ level: "error", rule, message });
  const warn = (rule: string, message: string) =>
    issues.push({ level: "warning", rule, message });
  const frames = asset.clips.flatMap((clip) => clip.frames);
  const tile = asset.category === "tiles";

  const used = new Set<string>();
  for (const s of frames)
    each(s, (x, y) => {
      const c = colorAt(s, x, y);
      if (c) used.add(c);
    });
  const offPalette = [...used].filter((c) => !pack.palette.includes(c));
  if (offPalette.length)
    error(
      "palette",
      `Colours outside the ${pack.id} palette: ${offPalette.join(" ")}.`,
    );
  if (used.size > pack.style.maxColors)
    error(
      "palette",
      `Uses ${used.size} colours; this pack allows ${pack.style.maxColors}.`,
    );

  frames.forEach((s, i) => {
    if (!s.data.some((v, j) => j % 4 === 3 && v > 0))
      error("empty", `Frame ${i + 1} is empty.`);
  });

  for (const clip of asset.clips) {
    if (clip.kind === "animation" && clip.frames.length < 2)
      warn("animation", `"${clip.name}" is an animation with one frame.`);
    clip.frames.forEach((s, i) => {
      const next = clip.frames[i + 1];
      if (next && sameFrame(s, next))
        warn(
          "animation",
          `"${clip.name}" frames ${i + 1} and ${i + 2} are identical.`,
        );
    });
  }

  if (tile) {
    frames.forEach((s, i) => {
      let clear = 0;
      each(s, (x, y) => void (filled(s, x, y) || clear++));
      if (clear)
        error(
          "tile",
          `Frame ${i + 1} has ${clear} clear pixels; tiles are opaque.`,
        );
      if (!clear) {
        if (seams(s, true))
          warn("seam", `Frame ${i + 1}: the left and right edges don't meet.`);
        if (seams(s, false))
          warn("seam", `Frame ${i + 1}: the top and bottom edges don't meet.`);
      }
    });
    return issues;
  }

  const box = bounds(frames);
  const s0 = frames[0]!;
  if (box) {
    if (
      box.x0 === 0 ||
      box.y0 === 0 ||
      box.x1 === s0.w - 1 ||
      box.y1 === s0.h - 1
    )
      warn("edge", "The drawing touches the canvas edge; it may be cut off.");
    const share =
      ((box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1)) / (s0.w * s0.h);
    if (share < MIN_CANVAS_SHARE)
      warn(
        "canvas",
        `The drawing fills ${Math.round(share * 100)}% of its canvas; crop the canvas or draw bigger.`,
      );
  }

  const outline = pack.style.outline;
  const shades = [...used].filter((c) => c !== outline);
  if (s0.w * s0.h >= 256 && shades.length < MIN_SHADES)
    warn(
      "shading",
      `Only ${shades.length} colours besides the outline; use a light, base and shadow tone.`,
    );

  const strays: string[] = [];
  let edge = 0;
  let outlined = 0;
  frames.forEach((s, i) =>
    each(s, (x, y) => {
      if (!filled(s, x, y)) return;
      if (!NEIGHBOURS_8.some(([dx, dy]) => filled(s, x + dx, y + dy)))
        strays.push(at(i, x, y));
      if (NEIGHBOURS_4.some(([dx, dy]) => !filled(s, x + dx, y + dy))) {
        edge++;
        const c = colorAt(s, x, y)!;
        if (c === outline || luma(c) < DARK) outlined++;
      }
    }),
  );
  if (strays.length)
    warn(
      "stray",
      `Lone pixels: ${strays.slice(0, 5).join(", ")}${strays.length > 5 ? ` and ${strays.length - 5} more` : ""}.`,
    );
  if (outline && edge && outlined / edge < OUTLINED_SHARE)
    warn(
      "outline",
      `Only ${Math.round((outlined / edge) * 100)}% of the silhouette is outlined with a dark colour.`,
    );

  return issues;
}

/** Every issue of an asset: from reading its file, then from these rules. */
export function issuesOf(
  asset: { def: AssetDef | null; issues: Issue[] },
  pack: PackSource,
): Issue[] {
  return [...asset.issues, ...(asset.def ? checkAsset(asset.def, pack) : [])];
}

export const hasErrors = (issues: Issue[]) =>
  issues.some((issue) => issue.level === "error");
