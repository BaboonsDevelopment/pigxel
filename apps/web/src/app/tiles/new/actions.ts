"use server";

import { MAX_HISTORY } from "@/lib/ai/constants";
import { toUserMessage } from "@/lib/ai/errors";
import {
  buildComposePrompt,
  buildEditSystemPrompt,
  buildEditUserMessage,
  buildImagePrompt,
  buildPlanPrompt,
  buildRedrawPrompt,
  clampRect,
  closestAspectRatio,
} from "@/lib/ai/helpers";
import { getAiProvider } from "@/lib/ai/provider";
import type {
  AiResult,
  ChatMessage,
  EditPlan,
  EditReply,
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
      action: { kind: route.intent, request: route.subject },
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
    const { mimeType, base64 } = await getAiProvider().generate(
      buildImagePrompt(subject, width, height),
      closestAspectRatio(width, height),
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
    const { mimeType, base64 } = await getAiProvider().redraw(
      buildRedrawPrompt(request, width, height),
      { mimeType: "image/png", base64: png },
      closestAspectRatio(width, height),
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
    // Kept objects stay where they are, so the edit happens in place.
    return { ...reply, source, target: keep.length ? source : target, keep };
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
