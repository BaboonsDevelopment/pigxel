import { GRID, OPS } from "@/lib/edit/constants";
import {
  ANIMATION_REVIEW_RULES,
  ANIMATION_RULES,
  ASPECT_RATIOS,
  EDIT_RESPONSE_RULES,
  EDIT_CRAFT_RULES,
  EDIT_REVIEW_RULES,
  IMAGE_BACKGROUND_RULES,
  IMAGE_STYLE_RULES,
  MAX_FRAMES,
  MAX_REDRAWN_FRAMES,
  MAX_TRACKS,
  PLACEMENT_RULES,
  PLAN_RULES,
  REFERENCE_RULES,
} from "./constants";
import type {
  AnimationFixes,
  AnimationPlan,
  AnimationReply,
  AnimationReviewReply,
  AnimationTrack,
  ChatMessage,
  Rect,
} from "./types";

/** Wraps a subject description in the pixel-art style rules for a grid size. */
export function buildImagePrompt(
  subject: string,
  width: number,
  height: number,
  /** Whether pictures to draw from come with the prompt. */
  withReferences = false,
): string {
  return [
    `A single pixel art game sprite, like one frame of a sprite sheet: ${subject}.`,
    ...(withReferences ? [REFERENCE_RULES] : []),
    `It is a ${width}x${height} pixel sprite drawn with small crisp pixels, centred on the picture with empty space around it.`,
    ...IMAGE_STYLE_RULES,
  ].join(" ");
}

/** How far a frame shape is from `width × height`, on a log scale. */
function ratioDistance(ratio: string, width: number, height: number) {
  const [w = 1, h = 1] = ratio.split(":").map(Number);
  return Math.abs(Math.log(w / h) - Math.log(width / height));
}

/** The supported frame shape closest to `width × height`. */
export function closestAspectRatio(width: number, height: number): string {
  return ASPECT_RATIOS.reduce((best, r) =>
    ratioDistance(r, width, height) < ratioDistance(best, width, height)
      ? r
      : best,
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
 * target grid. It gets the same pixel style and background rules as a new
 * picture, so the result goes through the same pipeline into pixels.
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

const box = (r: Rect) => `x ${r.x}, y ${r.y}, w ${r.w}, h ${r.h}`;

/** Numbered object boxes for a prompt, each with the layer it is on. */
function objectList(objects: Rect[], layers: string[]) {
  if (!objects.length) return "(nothing drawn)";
  return objects
    .map((r, i) => {
      const layer = layers[i];
      return `${i}: ${box(r)}${layer ? ` (layer "${layer}")` : ""}`;
    })
    .join("\n");
}

/** Asks the planner how to carry out an edit on the tile shown in the picture. */
export function buildPlanPrompt(args: {
  request: string;
  width: number;
  height: number;
  objects: Rect[];
  /** The name of the layer each object is on. */
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

/** Asks the placement planner where new pictures go on the tile shown. */
export function buildPlacementPrompt(args: {
  subject: string;
  where: string;
  count: number;
  width: number;
  height: number;
  objects: Rect[];
  /** The name of the layer each object is on. */
  layers: string[];
  /** Recent turns, so "5 more apples" is tied to the apple drawn before. */
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

// ── Animations ──────────────────────────────────────────────────────────────

/** How a sprite sheet is laid out: `cols × rows` cells, read row by row. */
export type SheetLayout = { cols: number; rows: number; aspectRatio: string };

/**
 * The grid for `count` cells of `cellW × cellH` whose overall shape comes
 * closest to a frame shape the image model can draw; fewer empty cells win
 * a tie.
 */
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

/**
 * Asks the image model for a sprite sheet: the same subject in every cell,
 * one pose per cell. With `fromReference`, the picture sent along shows the
 * subject, whose look must be kept.
 */
export function buildSheetPrompt(args: {
  subject: string;
  poses: string[];
  cellW: number;
  cellH: number;
  layout: SheetLayout;
  fromReference: boolean;
}): string {
  const { cols, rows } = args.layout;
  // Every frame gets its cell by name: models told only "left to right" still
  // fill sheets column by column now and then.
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
    `Each cell is a ${args.cellW}x${args.cellH} pixel sprite. The subject has the same size, colours and design in every frame, seen from the same camera, on the same baseline, centred in its cell with empty space around it; only the pose changes.`,
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

/** Asks the animation planner to plan `request` on the tile shown. */
export function buildAnimationPrompt(args: {
  request: string;
  width: number;
  height: number;
  /** Drawn layers, with the box of what is drawn in the current frame. */
  layers: { name: string; box: Rect | null }[];
  /** Separate drawn things in the current frame, and the layer each is on. */
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

/** Asks the checker whether an edit came out right (see EDIT_REVIEW_RULES). */
export function buildEditReviewPrompt(request: string, instruction: string) {
  return [
    `REQUEST: ${request}`,
    `INSTRUCTION GIVEN: ${instruction}`,
    EDIT_REVIEW_RULES,
  ].join("\n\n");
}

/** Asks the checker whether an animation works (see ANIMATION_REVIEW_RULES). */
export function buildAnimationReviewPrompt(
  request: string,
  plan: AnimationPlan,
  width: number,
  height: number,
) {
  const tracks = plan.tracks
    .map((t, i) => {
      const frames =
        t.kind === "sheet"
          ? t.poses.map((p, f) => `  frame ${f + 1}: ${p || "(not seen)"}`)
          : t.path.map(
              (r, f) => `  frame ${f + 1}: ${r ? box(r) : "(not seen)"}`,
            );
      return [`${i}: ${t.kind} "${t.name}" — ${t.subject}`, ...frames].join(
        "\n",
      );
    })
    .join("\n");
  return [
    `Each frame is the ${width}x${height} pixel tile; frameCount ${plan.frameCount}.`,
    `REQUEST: ${request}`,
    `TRACKS:\n${tracks}`,
    ANIMATION_REVIEW_RULES,
  ].join("\n\n");
}

/**
 * A plan sent back from the browser, fitted to the tile again with its tracks
 * in the same places: what a check reads of it.
 */
export function refitPlan(
  plan: AnimationPlan,
  width: number,
  height: number,
): AnimationPlan {
  const count = Math.round(Number(plan.frameCount));
  const frameCount = Number.isFinite(count)
    ? Math.max(2, Math.min(MAX_FRAMES, count))
    : 2;
  const perFrame = <T>(list: T[], fit: (item: T | undefined) => T) =>
    Array.from({ length: frameCount }, (_, i) =>
      fit(Array.isArray(list) ? list[i] : undefined),
    );
  const text = (value: unknown, max: number) =>
    String(value ?? "").slice(0, max);
  const tracks = plan.tracks.slice(0, MAX_TRACKS).map((t): AnimationTrack => {
    const name = text(t.name, 40);
    const subject = text(t.subject, 300);
    return t.kind === "prop"
      ? {
          kind: "prop",
          name,
          subject,
          copy: null,
          grab: null,
          path: perFrame(t.path, (r) =>
            r ? clampRect(r, width, height) : null,
          ),
        }
      : {
          kind: "sheet",
          name,
          subject,
          reuse: null,
          box: clampRect(t.box, width, height),
          poses: perFrame(t.poses, (p) => text(p, 200)),
        };
  });
  return { name: "", frameCount, duration: 0, tracks, summary: "" };
}

/**
 * The checker's answer as fixes that fit the plan: an order only for a sheet,
 * as frame indexes where it is seen (identity dropped); redraws of frames it is
 * seen in, at most MAX_REDRAWN_FRAMES in all; a path only for a prop, one box
 * inside the tile per frame. An answer saying all is fine gives no fixes.
 */
export function clampAnimationFixes(
  reply: AnimationReviewReply,
  plan: AnimationPlan,
  width: number,
  height: number,
): AnimationFixes {
  if (reply.ok) return { problem: "", tracks: [] };
  const n = plan.frameCount;
  let redraws = MAX_REDRAWN_FRAMES;
  const done = new Set<number>();
  const tracks = reply.fixes.flatMap((fix): AnimationFixes["tracks"] => {
    const track = plan.tracks[fix.track];
    if (!track || done.has(fix.track)) return [];
    done.add(fix.track);
    if (track.kind === "prop") {
      const path =
        Array.isArray(fix.path) && fix.path.length === n
          ? fix.path.map((r) =>
              r && r.visible !== false && r.w > 0 && r.h > 0
                ? clampRect(r, width, height)
                : null,
            )
          : null;
      return path?.some(Boolean)
        ? [{ track: fix.track, order: null, redraw: [], path }]
        : [];
    }
    const seen = (f: number) => Number.isInteger(f) && !!track.poses[f];
    const asked = Array.isArray(fix.order) && fix.order.length === n;
    const order = Array.from({ length: n }, (_, i) =>
      asked && seen(i) && seen(fix.order[i]! - 1) ? fix.order[i]! - 1 : i,
    );
    const redraw = (Array.isArray(fix.redraw) ? fix.redraw : [])
      .map((r) => ({
        frame: r.frame - 1,
        pose: String(r.pose ?? "").trim() || track.poses[r.frame - 1] || "",
      }))
      .filter((r, i, all) => {
        const first = all.findIndex((o) => o.frame === r.frame) === i;
        return seen(r.frame) && first && redraws-- > 0;
      });
    const reordered = order.some((f, i) => f !== i);
    return reordered || redraw.length
      ? [
          {
            track: fix.track,
            order: reordered ? order : null,
            redraw,
            path: null,
          },
        ]
      : [];
  });
  return { problem: tracks.length ? reply.problem : "", tracks };
}

/**
 * Turns the planner's answer into a plan that fits the tile: frame count and
 * duration in range, every box inside the tile, one pose and one path entry
 * per frame, and at most MAX_TRACKS tracks, none without anything to show.
 * `asked` is the frame count the user asked for (0 when they did not).
 */
export function clampAnimationPlan(
  reply: Partial<AnimationReply>,
  width: number,
  height: number,
  layerCount: number,
  asked: number,
  objectCount: number,
): AnimationPlan {
  const count = Math.round(Number(asked || reply.frameCount));
  const frameCount = Number.isFinite(count)
    ? Math.max(2, Math.min(MAX_FRAMES, count))
    : 6;
  const ms = Math.round(Number(reply.duration));
  const duration = Number.isFinite(ms) ? Math.max(20, Math.min(1000, ms)) : 100;
  const perFrame = <T>(list: T[] | undefined, empty: T) =>
    Array.from({ length: frameCount }, (_, i) => list?.[i] ?? empty);

  const tracks = (reply.tracks ?? []).flatMap((t): AnimationTrack[] => {
    const name = String(t.name || "Layer").slice(0, 40);
    const subject = String(t.subject ?? "").trim();
    if (!subject) return [];
    if (t.kind === "prop") {
      const path = perFrame(t.path, null).map((r) =>
        r && r.visible !== false ? clampRect(r, width, height) : null,
      );
      const layer =
        Number.isInteger(t.reuse) && t.reuse >= 0 && t.reuse < layerCount
          ? t.reuse
          : null;
      const grab =
        t.grab?.w > 0 && t.grab.h > 0
          ? { layer, area: clampRect(t.grab, width, height) }
          : null;
      const copy =
        !grab && Number.isInteger(t.copy) && t.copy >= 0 && t.copy < objectCount
          ? t.copy
          : null;
      return path.some(Boolean)
        ? [{ kind: "prop", name, subject, copy, grab, path }]
        : [];
    }
    const poses = perFrame(t.poses, "").map((p) => String(p).trim());
    if (!poses.some(Boolean) || !t.box) return [];
    const reuse =
      Number.isInteger(t.reuse) && t.reuse >= 0 && t.reuse < layerCount
        ? t.reuse
        : null;
    const area = clampRect(t.box, width, height);
    return [{ kind: "sheet", name, subject, reuse, box: area, poses }];
  });

  return {
    name: String(reply.name || "Animation").slice(0, 60),
    frameCount,
    duration,
    tracks: tracks.slice(0, MAX_TRACKS),
    summary: String(reply.summary ?? ""),
  };
}
