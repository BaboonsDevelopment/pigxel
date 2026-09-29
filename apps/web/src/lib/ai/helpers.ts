import { GRID, OPS } from "@/lib/edit/constants";
import {
  ASPECT_RATIOS,
  EDIT_RESPONSE_RULES,
  EDIT_CRAFT_RULES,
  IMAGE_BACKGROUND_RULES,
  IMAGE_STYLE_RULES,
  PLAN_RULES,
} from "./constants";
import type { Rect } from "./types";

/** Wraps a subject description in the pixel-art style rules for a grid size. */
export function buildImagePrompt(
  subject: string,
  width: number,
  height: number,
): string {
  return [
    subject,
    `Pixel art sprite on a ${width}x${height} pixel grid, readable at that size,`,
    ...IMAGE_STYLE_RULES,
  ].join(" ");
}

/** The supported frame shape closest to `width × height`. */
export function closestAspectRatio(width: number, height: number): string {
  const target = Math.log(width / height);
  const distance = (ratio: string) => {
    const [w = 1, h = 1] = ratio.split(":").map(Number);
    return Math.abs(Math.log(w / h) - target);
  };
  return ASPECT_RATIOS.reduce((best, r) =>
    distance(r) < distance(best) ? r : best,
  );
}

/** Asks for a spot on a `width × height` tile where `subject` fits the scene. */
export function buildComposePrompt(
  subject: string,
  width: number,
  height: number,
): string {
  return [
    `This is a ${width}x${height} pixel art tile, shown enlarged; light grey means empty.`,
    `Choose where to add: ${subject}.`,
    "Pick a rectangle that makes the scene look good together: a size that matches",
    "the scale of what is already there, standing on the same ground or floating where",
    "it makes sense, without covering the important parts of existing objects.",
    `Answer in tile pixels: x and y of the top-left corner, then w and h;`,
    `the rectangle must stay inside 0..${width} by 0..${height}.`,
  ].join(" ");
}

/** Keeps a rectangle inside a `width × height` tile, at least 1×1. */
export function clampRect(rect: Rect, width: number, height: number): Rect {
  const int = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0);
  const x = Math.max(0, Math.min(width - 1, int(rect.x)));
  const y = Math.max(0, Math.min(height - 1, int(rect.y)));
  return {
    x,
    y,
    w: Math.max(1, Math.min(width - x, int(rect.w))),
    h: Math.max(1, Math.min(height - y, int(rect.h))),
  };
}

/** The system prompt for precise edits, with the table of operations. */
export function buildEditSystemPrompt(): string {
  const table = OPS.map((op) => `  ${op.syntax.padEnd(30)} ${op.doc}`).join(
    "\n",
  );
  const rules = EDIT_RESPONSE_RULES.map((r, i) => `${i + 1}. ${r}`).join("\n");
  return `You are a pixel-art assistant in a sprite editor. You read the tile as a character grid and reply with edit operations.

# Reading the grid
SIZE is the tile size; REGION, when present, is the only area you may change.
Each character is one pixel and indexes COLORS; "${GRID.transparent}" is transparent.
Coordinates are absolute: x grows right, y grows down, origin top-left. The
rulers show absolute values, so read coordinates straight off them.

# Replying
Reply with {"summary": "...", "ops": ["...", "..."]}, one operation per string, applied in order:
${table}
In blit rows "${GRID.transparent}" writes transparent and "${GRID.keep}" keeps the existing pixel.
Examples: pal 9 #e43b44 · px 9 12,8 13,8 · blit 4,2 ..99../.9999./_99__

# Pixel-art craft
${EDIT_CRAFT_RULES}

# Rules
${rules}`;
}

/** The user turn of a precise edit: the grid plus the request. */
export function buildEditUserMessage(grid: string, request: string): string {
  return `<tile>\n${grid}\n</tile>\n<request>${request}</request>`;
}

/**
 * Asks the image model to redraw a picture of the edited object for the
 * target grid. It gets the same pixel style and magenta-background rules as a
 * new picture, so the result goes through the same pipeline into pixels.
 */
export function buildRedrawPrompt(
  instruction: string,
  width: number,
  height: number,
): string {
  return [
    `Redraw this pixel art sprite as a ${width}x${height} pixel sprite: ${instruction}.`,
    "Keep its design, colours, outline, proportions and pose exactly as they are",
    "unless the instruction changes them. The subject fills the frame.",
    IMAGE_STYLE_RULES[0],
    ...IMAGE_BACKGROUND_RULES,
  ].join(" ");
}

/** Asks the planner how to carry out an edit on the tile shown in the picture. */
export function buildPlanPrompt(args: {
  request: string;
  width: number;
  height: number;
  objects: Rect[];
  selection: Rect | null;
}): string {
  const box = (r: Rect) => `x ${r.x}, y ${r.y}, w ${r.w}, h ${r.h}`;
  const objects = args.objects.length
    ? args.objects.map((r, i) => `${i}: ${box(r)}`).join("\n")
    : "(nothing drawn)";
  const selection = args.selection
    ? `\nSELECTED AREA (the user limited the edit to it): ${box(args.selection)}`
    : "";
  return [
    `The picture is a ${args.width}x${args.height} pixel art tile, shown enlarged; light grey means empty.`,
    `OBJECTS (separate drawn things, in tile pixels):\n${objects}${selection}`,
    `REQUEST: ${args.request}`,
    PLAN_RULES,
  ].join("\n\n");
}
