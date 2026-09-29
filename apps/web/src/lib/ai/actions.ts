"use server";

import { MAX_FRAMES, MAX_HISTORY, PLACEMENT_HISTORY } from "@/lib/ai/constants";
import { toUserMessage } from "@/lib/ai/errors";
import {
  buildAnimationPrompt,
  buildComposePrompt,
  buildEditSystemPrompt,
  buildEditUserMessage,
  buildImagePrompt,
  buildPlacementPrompt,
  buildPlanPrompt,
  buildRedrawPrompt,
  buildSheetPrompt,
  clampAnimationPlan,
  clampRect,
  closestAspectRatio,
  sheetLayout,
  type SheetLayout,
} from "@/lib/ai/helpers";
import { getAiProvider } from "@/lib/ai/provider";
import type {
  AiResult,
  AnimationPlan,
  ChatMessage,
  EditPlan,
  EditReply,
  PlacementPlan,
  Rect,
} from "@/lib/ai/types";
import { MAX_OBJECTS } from "@/lib/edit/constants";
import { requireUser } from "@/lib/auth/session";

const MAX_GRID = 256;
/** A PNG data URL of at most ~1.5 MB, capturing its base64 payload. */
const PNG_DATA_URL = /^data:image\/png;base64,([A-Za-z0-9+/=]{1,2000000})$/;
/** Guards against oversized requests; a full 256×256 tile grid is ~70k. */
const MAX_GRID_TEXT = 100_000;

const validSize = (n: number) => Number.isInteger(n) && n > 0 && n <= MAX_GRID;

async function attempt<T>(label: string, run: () => Promise<T>) {
  try {
    return { ok: true, value: await run() } as const;
  } catch (e) {
    console.error(`[ai] ${label} failed:`, e);
    return { ok: false, error: toUserMessage(e) } as const;
  }
}

/**
 * Routes the latest message. Chat is answered right away; anything that
 * changes the tile comes back as an action the client carries out.
 */
export async function sendMessage(
  messages: ChatMessage[],
): Promise<AiResult<ChatMessage>> {
  await requireUser();
  return attempt("sendMessage", async () => {
    const ai = getAiProvider();
    // Recent turns give follow-ups like "make it bigger" their meaning.
    const recent = messages.slice(-MAX_HISTORY);
    const route = await ai.route(recent);
    if (route.intent === "chat") {
      return { role: "assistant", content: await ai.chat(recent) };
    }
    // The router spells out what the latest message refers to.
    return {
      role: "assistant",
      content: `${route.intent}: ${route.subject}`,
      action: {
        kind: route.intent,
        request: route.subject,
        where: route.where,
        count: route.count,
        name: route.name,
        frames: route.frames,
      },
    };
  });
}

/** Draws `subject` as pixel art for a `width × height` grid; returns a data URL. */
export async function generateImage(
  subject: string,
  width: number,
  height: number,
): Promise<AiResult<string>> {
  await requireUser();
  if (!subject.trim() || !validSize(width) || !validSize(height)) {
    return { ok: false, error: "That area cannot be used for a picture." };
  }
  return attempt("generateImage", async () => {
    const ai = getAiProvider();
    const { mimeType, base64 } = await ai.generate(
      buildImagePrompt(subject, width, height),
      closestAspectRatio(width, height, ai.aspectRatios),
    );
    return `data:${mimeType};base64,${base64}`;
  });
}

/** Precise edit: the tile as a text grid in, pixel operations out. */
export async function editTile(
  request: string,
  grid: string,
): Promise<AiResult<EditReply>> {
  await requireUser();
  if (!request.trim() || !grid || grid.length > MAX_GRID_TEXT) {
    return { ok: false, error: "That area is too big to edit this way." };
  }
  return attempt("editTile", () =>
    getAiProvider().edit(
      buildEditSystemPrompt(),
      buildEditUserMessage(grid, request),
    ),
  );
}

/** Creative edit: a picture of the area in, the changed picture out. */
export async function redrawArea(
  request: string,
  picture: string,
  width: number,
  height: number,
): Promise<AiResult<string>> {
  await requireUser();
  const png = PNG_DATA_URL.exec(picture)?.[1];
  if (!request.trim() || !png || !validSize(width) || !validSize(height)) {
    return { ok: false, error: "That area cannot be redrawn." };
  }
  return attempt("redrawArea", async () => {
    const ai = getAiProvider();
    const { mimeType, base64 } = await ai.redraw(
      buildRedrawPrompt(request, width, height),
      { mimeType: "image/png", base64: png },
      closestAspectRatio(width, height, ai.aspectRatios),
    );
    return `data:${mimeType};base64,${base64}`;
  });
}

/**
 * Looks at the current tile (a PNG data URL) and picks the area where
 * `subject` would fit the existing scene best.
 */
export async function suggestComposition(
  subject: string,
  tile: string,
  width: number,
  height: number,
): Promise<AiResult<Rect>> {
  await requireUser();
  const png = PNG_DATA_URL.exec(tile)?.[1];
  if (!subject.trim() || !png || !validSize(width) || !validSize(height)) {
    return { ok: false, error: "The tile could not be analysed." };
  }
  return attempt("suggestComposition", async () => {
    const rect = await getAiProvider().compose(
      buildComposePrompt(subject, width, height),
      { mimeType: "image/png", base64: png },
    );
    return clampRect(rect, width, height);
  });
}

/**
 * Decides how to carry out an edit: which object changes (`objects` are the
 * drawn things found on the tile), where the result goes, and whether exact
 * pixel operations or a redraw suit it. `drawn` is used when the edit is not
 * about one object; `selection` limits the edit to what the user selected.
 */
export async function planEdit(args: {
  request: string;
  tile: string;
  width: number;
  height: number;
  objects: Rect[];
  /** The name of the layer each object is on. */
  layers: string[];
  drawn: Rect;
  selection: Rect | null;
}): Promise<AiResult<EditPlan>> {
  await requireUser();
  const { request, width, height } = args;
  const png = PNG_DATA_URL.exec(args.tile)?.[1];
  const rects = [
    args.drawn,
    ...args.objects,
    ...(args.selection ? [args.selection] : []),
  ];
  const valid =
    request.trim() &&
    png &&
    validSize(width) &&
    validSize(height) &&
    args.objects.length <= MAX_OBJECTS &&
    rects.every((r) => [r.x, r.y, r.w, r.h].every(Number.isInteger));
  if (!valid) return { ok: false, error: "The tile could not be analysed." };

  return attempt("planEdit", async () => {
    const reply = await getAiProvider().plan(
      buildPlanPrompt({
        request,
        width,
        height,
        objects: args.objects,
        layers: args.layers,
        selection: args.selection,
      }),
      { mimeType: "image/png", base64: png! },
    );
    const source = clampRect(
      args.selection ??
        unionOf(
          [...reply.objects, ...reply.keep].map((i) => args.objects[i]),
        ) ??
        args.drawn,
      width,
      height,
    );
    // Exact operations work in place; a move keeps the size; only a
    // redraw can resize.
    const placed = clampRect(reply.target, width, height);
    const target =
      reply.mode === "ops"
        ? source
        : reply.mode === "move"
          ? clampRect({ ...placed, w: source.w, h: source.h }, width, height)
          : placed;
    const keep = reply.keep
      .map((i) => args.objects[i])
      .filter((r): r is Rect => !!r);
    const objects = reply.objects.filter((i) => !!args.objects[i]);
    // Kept objects stay where they are, so the edit happens in place.
    return {
      ...reply,
      objects,
      source,
      target: keep.length ? source : target,
      keep,
    };
  });
}

/** The box around all given rectangles; null when there are none. */
function unionOf(rects: (Rect | undefined)[]): Rect | null {
  const found = rects.filter((r): r is Rect => !!r);
  if (!found.length) return null;
  const x = Math.min(...found.map((r) => r.x));
  const y = Math.min(...found.map((r) => r.y));
  const right = Math.max(...found.map((r) => r.x + r.w));
  const bottom = Math.max(...found.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/**
 * Decides where new pictures go on a tile that has drawings: free spots that
 * follow `where`, or copies of an existing object when the user asked for
 * more of it. `ask` comes back when there is no room without covering art.
 */
export async function planPlacement(args: {
  subject: string;
  where: string;
  count: number;
  tile: string;
  width: number;
  height: number;
  objects: Rect[];
  /** The name of the layer each object is on. */
  layers: string[];
  recent: ChatMessage[];
}): Promise<AiResult<PlacementPlan>> {
  await requireUser();
  const { width, height } = args;
  const png = PNG_DATA_URL.exec(args.tile)?.[1];
  const valid =
    args.subject.trim() &&
    png &&
    validSize(width) &&
    validSize(height) &&
    Number.isInteger(args.count) &&
    args.count >= 1 &&
    args.objects.length <= MAX_OBJECTS &&
    args.objects.every((r) => [r.x, r.y, r.w, r.h].every(Number.isInteger));
  if (!valid) return { ok: false, error: "The tile could not be analysed." };

  return attempt("planPlacement", async () => {
    const reply = await getAiProvider().place(
      buildPlacementPrompt({
        ...args,
        where: args.where.trim(),
        recent: args.recent
          .slice(-PLACEMENT_HISTORY)
          .map(({ role, content }) => ({
            role,
            content: content.slice(0, 500),
          })),
      }),
      { mimeType: "image/png", base64: png! },
    );
    const copied = args.objects[reply.copyOf];
    const copyOf = copied ? reply.copyOf : null;
    const areas = reply.areas
      .slice(0, args.count)
      .map((r) => clampRect(r, width, height))
      // A copy keeps the size of the original.
      .map((r) =>
        copied
          ? clampRect({ ...r, w: copied.w, h: copied.h }, width, height)
          : r,
      );
    return {
      copyOf,
      areas,
      ask: reply.ask || !areas.length,
      question: reply.question,
    };
  });
}

/**
 * Plans an animation of `request` on the tile (a PNG data URL): its frames
 * and one track per thing that moves. `layers` are the drawn layers, which
 * the plan may reuse by index; `frames` is the count asked for, or 0.
 */
export async function planAnimation(args: {
  request: string;
  tile: string;
  width: number;
  height: number;
  layers: { name: string; box: Rect | null }[];
  frames: number;
}): Promise<AiResult<AnimationPlan>> {
  await requireUser();
  const { request, width, height } = args;
  const png = PNG_DATA_URL.exec(args.tile)?.[1];
  const valid =
    request.trim() &&
    png &&
    validSize(width) &&
    validSize(height) &&
    Number.isInteger(args.frames) &&
    args.frames >= 0 &&
    args.frames <= MAX_FRAMES &&
    args.layers.length <= MAX_OBJECTS;
  if (!valid) return { ok: false, error: "The tile could not be analysed." };

  return attempt("planAnimation", async () => {
    const reply = await getAiProvider().animate(
      buildAnimationPrompt({
        ...args,
        layers: args.layers.map((l) => ({ ...l, name: l.name.slice(0, 40) })),
      }),
      { mimeType: "image/png", base64: png! },
    );
    return clampAnimationPlan(
      reply,
      width,
      height,
      args.layers.length,
      args.frames,
    );
  });
}

/**
 * Draws `subject` in every pose as one sprite sheet (paid), each cell sized
 * for `cellW × cellH` tile pixels. With `reference` (a PNG data URL of what
 * is already drawn), its look is kept. Returns the picture and its grid.
 */
export async function generateSheet(args: {
  subject: string;
  poses: string[];
  cellW: number;
  cellH: number;
  reference: string | null;
}): Promise<AiResult<{ image: string; layout: SheetLayout }>> {
  await requireUser();
  const reference = args.reference
    ? PNG_DATA_URL.exec(args.reference)?.[1]
    : null;
  const valid =
    args.subject.trim() &&
    args.poses.length >= 1 &&
    args.poses.length <= MAX_FRAMES &&
    args.poses.every((p) => typeof p === "string" && p.trim()) &&
    validSize(args.cellW) &&
    validSize(args.cellH) &&
    reference !== undefined;
  if (!valid) return { ok: false, error: "That animation cannot be drawn." };

  return attempt("generateSheet", async () => {
    const ai = getAiProvider();
    const layout = sheetLayout(
      args.poses.length,
      args.cellW,
      args.cellH,
      ai.aspectRatios,
    );
    const prompt = buildSheetPrompt({
      ...args,
      layout,
      fromReference: !!reference,
    });
    const { mimeType, base64 } = reference
      ? await ai.redraw(
          prompt,
          { mimeType: "image/png", base64: reference },
          layout.aspectRatio,
        )
      : await ai.generate(prompt, layout.aspectRatio);
    return { image: `data:${mimeType};base64,${base64}`, layout };
  });
}
