"use server";

import {
  MAX_FRAMES,
  MAX_HISTORY,
  MAX_REFERENCES,
  MAX_SET_ITEMS,
  PLACEMENT_HISTORY,
  SMALL_IMAGE_MAX_SIDE,
} from "./constants";
import { creditBalance, creditsOf } from "./credits";
import { AiError, toUserMessage } from "./errors";
import {
  buildAnimationPrompt,
  buildComposePrompt,
  buildEditReviewPrompt,
  buildEditSystemPrompt,
  buildEditUserMessage,
  buildImagePrompt,
  buildPlacementPrompt,
  buildPlanPrompt,
  buildRedrawPrompt,
  buildSetPrompt,
  buildSheetPrompt,
  buildSheetRedrawPrompt,
  clampAnimationPlan,
  clampRect,
  closestAspectRatio,
  sheetLayout,
  type SheetLayout,
} from "./helpers";
import { getAiProvider } from "./provider";
import type {
  AiResult,
  AnimationPlan,
  ChatMessage,
  EditPlan,
  EditReply,
  EditReview,
  PlacementPlan,
  Rect,
} from "./types";
import { MAX_OBJECTS } from "@/lib/edit/constants";
import { unionOf } from "@/lib/edit/raster";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const MAX_GRID = 256;
const PNG_DATA_URL = /^data:image\/png;base64,([A-Za-z0-9+/=]{1,2000000})$/;
const IMAGE_DATA_URL =
  /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]{1,2000000})$/;
const MAX_GRID_TEXT = 100_000;

const validSize = (n: number) => Number.isInteger(n) && n > 0 && n <= MAX_GRID;

async function attempt<T>(label: string, run: () => Promise<T>) {
  try {
    if ((await creditBalance()).left <= 0)
      throw new AiError("no_credits", "No AI tokens left.");
    return { ok: true, value: await run() } as const;
  } catch (e) {
    console.error(`[ai] ${label} failed:`, e);
    return { ok: false, error: toUserMessage(e) } as const;
  }
}

export async function sendMessage(
  messages: ChatMessage[],
): Promise<AiResult<ChatMessage>> {
  await requireUser();
  return attempt("sendMessage", async () => {
    const ai = getAiProvider();
    const recent = messages.slice(-MAX_HISTORY);
    const route = await ai.route(recent);
    if (route.intent === "chat") {
      return { role: "assistant", content: await ai.chat(recent) };
    }
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
        items: route.items,
      },
    };
  });
}

export async function generateImage(
  subject: string,
  width: number,
  height: number,
  references: string[] = [],
): Promise<AiResult<string>> {
  await requireUser();
  const pictures = (Array.isArray(references) ? references : []).map((r) =>
    IMAGE_DATA_URL.exec(String(r)),
  );
  if (
    !subject.trim() ||
    !validSize(width) ||
    !validSize(height) ||
    pictures.length > MAX_REFERENCES ||
    pictures.some((p) => !p)
  ) {
    return { ok: false, error: "That area cannot be used for a picture." };
  }
  return attempt("generateImage", async () => {
    const { mimeType, base64 } = await getAiProvider().generate(
      buildImagePrompt(subject, width, height, pictures.length > 0),
      closestAspectRatio(width, height),
      Math.max(width, height) <= SMALL_IMAGE_MAX_SIDE,
      pictures.map((p) => ({ mimeType: p![1]!, base64: p![2]! })),
    );
    return `data:${mimeType};base64,${base64}`;
  });
}

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
      Math.max(width, height) <= SMALL_IMAGE_MAX_SIDE,
    );
    return `data:${mimeType};base64,${base64}`;
  });
}

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

export async function planEdit(args: {
  request: string;
  tile: string;
  width: number;
  height: number;
  objects: Rect[];
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
    return {
      mode: reply.mode,
      objects,
      source,
      target: keep.length ? source : target,
      keep,
      instruction: reply.instruction,
      summary: reply.summary,
      question: reply.question,
    };
  });
}

export async function planPlacement(args: {
  subject: string;
  where: string;
  count: number;
  tile: string;
  width: number;
  height: number;
  objects: Rect[];
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

export async function planAnimation(args: {
  request: string;
  tile: string;
  width: number;
  height: number;
  layers: { name: string; box: Rect | null }[];
  objects: Rect[];
  objectLayers: string[];
  frames: number;
}): Promise<AiResult<AnimationPlan>> {
  await requireUser();
  const { request, width, height } = args;
  const png = PNG_DATA_URL.exec(args.tile)?.[1];
  const list = <T>(value: T[] | undefined) =>
    Array.isArray(value) ? value : [];
  const layers = list(args.layers);
  const objects = list(args.objects);
  const objectLayers = list(args.objectLayers).map((n) =>
    String(n).slice(0, 40),
  );
  const valid =
    typeof request === "string" &&
    request.trim() &&
    png &&
    validSize(width) &&
    validSize(height) &&
    Number.isInteger(args.frames) &&
    args.frames >= 0 &&
    args.frames <= MAX_FRAMES &&
    layers.length <= MAX_OBJECTS &&
    objects.length <= MAX_OBJECTS &&
    objects.every((r) => [r.x, r.y, r.w, r.h].every(Number.isInteger));
  if (!valid) return { ok: false, error: "The tile could not be analysed." };

  return attempt("planAnimation", async () => {
    const reply = await getAiProvider().animate(
      buildAnimationPrompt({
        request,
        width,
        height,
        frames: args.frames,
        layers: layers.map((l) => ({
          ...l,
          name: String(l.name).slice(0, 40),
        })),
        objects,
        objectLayers,
      }),
      { mimeType: "image/png", base64: png! },
    );
    return clampAnimationPlan(reply, width, height, layers.length, args.frames);
  });
}

export async function reviewEdit(args: {
  request: string;
  instruction: string;
  before: string;
  after: string;
}): Promise<AiResult<EditReview>> {
  await requireUser();
  const before = PNG_DATA_URL.exec(args.before)?.[1];
  const after = PNG_DATA_URL.exec(args.after)?.[1];
  if (!args.request?.trim() || !before || !after)
    return { ok: false, error: "The edit could not be checked." };
  return attempt("reviewEdit", () =>
    getAiProvider().reviewEdit(
      buildEditReviewPrompt(
        args.request.slice(0, 1000),
        String(args.instruction ?? "").slice(0, 1000),
      ),
      { mimeType: "image/png", base64: before },
      { mimeType: "image/png", base64: after },
    ),
  );
}

export async function generateSet(args: {
  subjects: string[];
  cellW: number;
  cellH: number;
}): Promise<AiResult<{ image: string; layout: SheetLayout }>> {
  await requireUser();
  const subjects = Array.isArray(args.subjects) ? args.subjects : [];
  const valid =
    subjects.length >= 2 &&
    subjects.length <= MAX_SET_ITEMS &&
    subjects.every((s) => typeof s === "string" && s.trim()) &&
    validSize(args.cellW) &&
    validSize(args.cellH);
  if (!valid) return { ok: false, error: "Those things cannot be drawn." };
  return attempt("generateSet", async () => {
    const layout = sheetLayout(subjects.length, args.cellW, args.cellH);
    const { mimeType, base64 } = await getAiProvider().generate(
      buildSetPrompt({
        subjects: subjects.map((s) => s.slice(0, 300)),
        cellW: args.cellW,
        cellH: args.cellH,
        layout,
      }),
      layout.aspectRatio,
      false,
    );
    return { image: `data:${mimeType};base64,${base64}`, layout };
  });
}

export async function redrawFrames(args: {
  instruction: string;
  sheet: string;
  count: number;
  cellW: number;
  cellH: number;
}): Promise<AiResult<{ image: string; layout: SheetLayout }>> {
  await requireUser();
  const png = PNG_DATA_URL.exec(args.sheet)?.[1];
  const valid =
    typeof args.instruction === "string" &&
    args.instruction.trim() &&
    png &&
    Number.isInteger(args.count) &&
    args.count >= 2 &&
    args.count <= MAX_FRAMES &&
    validSize(args.cellW) &&
    validSize(args.cellH);
  if (!valid) return { ok: false, error: "Those frames cannot be redrawn." };
  return attempt("redrawFrames", async () => {
    const layout = sheetLayout(args.count, args.cellW, args.cellH);
    const { mimeType, base64 } = await getAiProvider().redraw(
      buildSheetRedrawPrompt({
        instruction: args.instruction.slice(0, 1000),
        count: args.count,
        cellW: args.cellW,
        cellH: args.cellH,
        layout,
      }),
      { mimeType: "image/png", base64: png! },
      layout.aspectRatio,
      false,
    );
    return { image: `data:${mimeType};base64,${base64}`, layout };
  });
}

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
    const layout = sheetLayout(args.poses.length, args.cellW, args.cellH);
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
          false,
        )
      : await ai.generate(prompt, layout.aspectRatio, false);
    return { image: `data:${mimeType};base64,${base64}`, layout };
  });
}

export type UsageRow = { step: string; credits: number; at: string };

export async function listAiUsage(): Promise<UsageRow[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_usage")
    .select("step, cost_usd, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Couldn’t load AI usage: ${error.message}`);
  if (!data) return [];
  return data.map((row) => ({
    step: row.step,
    credits: creditsOf(Number(row.cost_usd ?? 0)),
    at: row.created_at,
  }));
}

export async function getAiBalance(): Promise<{
  limit: number;
  left: number;
}> {
  await requireUser();
  const { limit, left } = await creditBalance();
  return { limit, left: Math.floor(left) };
}
