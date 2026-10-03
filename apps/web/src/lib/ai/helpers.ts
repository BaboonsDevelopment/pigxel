import { GRID, OPS } from "@/lib/edit/constants";
import {
  ANIMATION_RULES,
  ASPECT_RATIOS,
  EDIT_RESPONSE_RULES,
  EDIT_CRAFT_RULES,
  EDIT_REVIEW_RULES,
  IMAGE_BACKGROUND_RULES,
  IMAGE_STYLE_RULES,
  MAX_FRAMES,
  PLACEMENT_RULES,
  PLAN_RULES,
  REFERENCE_RULES,
} from "./constants";
import type {
  AnimationPlan,
  AnimationReply,
  SheetTrack,
  ChatMessage,
  Rect,
} from "./types";

export function buildImagePrompt(
  subject: string,
  width: number,
  height: number,
  withReferences = false,
): string {
  return [
    `A single pixel art game sprite, like one frame of a sprite sheet: ${subject}.`,
    ...(withReferences ? [REFERENCE_RULES] : []),
    `It is a ${width}x${height} pixel sprite drawn with small crisp pixels, centred on the picture with empty space around it.`,
    ...IMAGE_STYLE_RULES,
  ].join(" ");
}

function ratioDistance(ratio: string, width: number, height: number) {
  const [w = 1, h = 1] = ratio.split(":").map(Number);
  return Math.abs(Math.log(w / h) - Math.log(width / height));
}

export function closestAspectRatio(width: number, height: number): string {
  return ASPECT_RATIOS.reduce((best, r) =>
    ratioDistance(r, width, height) < ratioDistance(best, width, height)
      ? r
      : best,
  );
}

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

export function buildEditUserMessage(grid: string, request: string): string {
  return `<tile>\n${grid}\n</tile>\n<request>${request}</request>`;
}

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

const box = (r: Rect) => `x ${r.x}, y ${r.y}, w ${r.w}, h ${r.h}`;

function objectList(objects: Rect[], layers: string[]) {
  if (!objects.length) return "(nothing drawn)";
  return objects
    .map((r, i) => {
      const layer = layers[i];
      return `${i}: ${box(r)}${layer ? ` (layer "${layer}")` : ""}`;
    })
    .join("\n");
}

export function buildPlanPrompt(args: {
  request: string;
  width: number;
  height: number;
  objects: Rect[];
  layers: string[];
  selection: Rect | null;
}): string {
  const objects = objectList(args.objects, args.layers);
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

export function buildPlacementPrompt(args: {
  subject: string;
  where: string;
  count: number;
  width: number;
  height: number;
  objects: Rect[];
  layers: string[];
  recent: ChatMessage[];
}): string {
  const objects = objectList(args.objects, args.layers);
  const recent = args.recent.map((m) => `${m.role}: ${m.content}`).join("\n");
  return [
    `The picture is a ${args.width}x${args.height} pixel art tile, shown enlarged; light grey means empty.`,
    `OBJECTS (separate drawn things, in tile pixels):\n${objects}`,
    `CONVERSATION (latest last):\n${recent || "(none)"}`,
    `NEW: ${args.count} × ${args.subject}`,
    `WHERE: ${args.where || "(not said)"}`,
    PLACEMENT_RULES,
  ].join("\n\n");
}

export type SheetLayout = { cols: number; rows: number; aspectRatio: string };

export function sheetLayout(
  count: number,
  cellW: number,
  cellH: number,
): SheetLayout {
  let best = { cols: count, rows: 1, aspectRatio: "1:1", score: Infinity };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const w = cols * cellW;
    const h = rows * cellH;
    const aspectRatio = closestAspectRatio(w, h);
    const empty = cols * rows - count;
    const score = ratioDistance(aspectRatio, w, h) + empty * 0.05;
    if (score < best.score) best = { cols, rows, aspectRatio, score };
  }
  const { cols, rows, aspectRatio } = best;
  return { cols, rows, aspectRatio };
}

export function buildSheetRedrawPrompt(args: {
  instruction: string;
  count: number;
  cellW: number;
  cellH: number;
  layout: SheetLayout;
}): string {
  const { cols, rows } = args.layout;
  return [
    `This picture is a pixel art sprite sheet: ${args.count} frames of one animation on a grid of exactly ${cols} columns and ${rows} rows of equal cells, in reading order, each cell a ${args.cellW}x${args.cellH} pixel sprite.`,
    args.count < cols * rows
      ? "The remaining cells at the end of the last row are empty and stay empty."
      : "",
    `Redraw the whole sheet with this change: ${args.instruction}.`,
    "First make the change in frame 1 (top left). Frame 1 is then the model sheet for the whole animation: in every other frame, redraw the subject so it is the very same character as in frame 1 — the same design, face, head, hair, clothes, accessories, colours, outline, size, proportions and the same side it is seen from — even where the frames differ from each other now.",
    "Only the movement may differ between frames: each frame keeps its own pose (limbs, small motions) and its place in its cell; everything else matches frame 1 exactly, as one character animated, not several look-alikes.",
    "Keep the grid exactly: every frame stays in its cell. Change nothing else the instruction does not ask for.",
    "No grid lines, no numbers, no labels.",
    IMAGE_STYLE_RULES[0],
    ...IMAGE_BACKGROUND_RULES,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildSetPrompt(args: {
  subjects: string[];
  cellW: number;
  cellH: number;
  layout: SheetLayout;
}): string {
  const { cols, rows } = args.layout;
  const cells = args.subjects
    .map(
      (subject, i) =>
        `Cell ${i + 1} in row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}: ${subject}.`,
    )
    .join(" ");
  return [
    `A pixel art sprite sheet of ${args.subjects.length} different game sprites on a grid of exactly ${cols} columns and ${rows} rows of equal cells, one sprite per cell, in reading order: the top row from left to right, then the next row.`,
    cells,
    `Each cell is a ${args.cellW}x${args.cellH} pixel sprite. Each sprite is whole, centred in its cell with empty space around it, and never touches or crosses into another cell.`,
    "All sprites share one style, palette, outline and light, as art of one game, and keep their real sizes relative to each other (a dog is bigger than an apple).",
    args.subjects.length < cols * rows
      ? "Leave the remaining cells at the end of the last row empty."
      : "",
    "No grid lines, no numbers, no labels.",
    ...IMAGE_STYLE_RULES.slice(0, 4),
    ...IMAGE_BACKGROUND_RULES,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildSheetPrompt(args: {
  subject: string;
  poses: string[];
  cellW: number;
  cellH: number;
  layout: SheetLayout;
  fromReference: boolean;
}): string {
  const { cols, rows } = args.layout;
  const frames = args.poses
    .map(
      (pose, i) =>
        `Frame ${i + 1} in row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}: ${pose}.`,
    )
    .join(" ");
  return [
    `A pixel art sprite sheet of ${args.poses.length} animation frames on a grid of exactly ${cols} columns and ${rows} rows of equal cells.`,
    `The frames go in reading order: fill the top row from left to right, then the next row from left to right; never fill a column top to bottom.`,
    args.fromReference
      ? `Every frame shows the subject of the attached picture (${args.subject}) with exactly its design, colours, outline and proportions.`
      : `Every frame shows the same subject: ${args.subject}.`,
    `Each cell is the same ${args.cellW}x${args.cellH} pixel scene seen by one fixed camera: the subject keeps its size, colours, design and place in every frame, and only what moves changes. Everything a frame shows stays inside its cell, never crossing into another cell, with a little empty space at the cell edges.`,
    frames,
    args.poses.length < cols * rows
      ? "Leave the remaining cells at the end of the last row empty."
      : "",
    "No grid lines, no numbers, no labels.",
    ...IMAGE_STYLE_RULES.slice(0, 3),
    ...IMAGE_BACKGROUND_RULES,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildAnimationPrompt(args: {
  request: string;
  width: number;
  height: number;
  layers: { name: string; box: Rect | null }[];
  objects: Rect[];
  objectLayers: string[];
  frames: number;
}): string {
  const layers = args.layers.length
    ? args.layers
        .map(
          (l, i) =>
            `${i}: "${l.name}"${l.box ? ` at ${box(l.box)}` : " (empty)"}`,
        )
        .join("\n")
    : "(none)";
  return [
    `The picture is a ${args.width}x${args.height} pixel art tile, shown enlarged; light grey means empty.`,
    `LAYERS (what is already drawn):\n${layers}`,
    `OBJECTS (separate drawn things, in tile pixels):\n${objectList(args.objects, args.objectLayers)}`,
    `FRAMES: ${args.frames || "(not said)"}`,
    `REQUEST: ${args.request}`,
    ANIMATION_RULES,
  ].join("\n\n");
}

export function buildEditReviewPrompt(request: string, instruction: string) {
  return [
    `REQUEST: ${request}`,
    `INSTRUCTION GIVEN: ${instruction}`,
    EDIT_REVIEW_RULES,
  ].join("\n\n");
}

export function clampAnimationPlan(
  reply: Partial<AnimationReply>,
  width: number,
  height: number,
  layerCount: number,
  asked: number,
): AnimationPlan {
  const count = Math.round(Number(asked || reply.frameCount));
  const frameCount = Number.isFinite(count)
    ? Math.max(2, Math.min(MAX_FRAMES, count))
    : 6;
  const ms = Math.round(Number(reply.duration));
  const duration = Number.isFinite(ms) ? Math.max(20, Math.min(1000, ms)) : 100;

  const tracks = (reply.tracks ?? []).flatMap((t): SheetTrack[] => {
    const subject = String(t.subject ?? "").trim();
    const poses = Array.from({ length: frameCount }, (_, i) =>
      String(t.poses?.[i] ?? "").trim(),
    );
    if (!subject || !poses.some(Boolean) || !t.box) return [];
    const reuse =
      Number.isInteger(t.reuse) && t.reuse >= 0 && t.reuse < layerCount
        ? t.reuse
        : null;
    return [
      {
        name: String(t.name || "Animation").slice(0, 40),
        subject,
        reuse,
        box: clampRect(t.box, width, height),
        poses,
      },
    ];
  });

  return {
    name: String(reply.name || "Animation").slice(0, 60),
    frameCount,
    duration,
    tracks: tracks.slice(0, 1),
    summary: String(reply.summary ?? ""),
  };
}
