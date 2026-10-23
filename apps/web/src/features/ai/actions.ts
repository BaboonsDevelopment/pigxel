"use server";

import {
  MAX_FRAMES,
  MAX_HISTORY,
  MAX_REFERENCES,
  MAX_SET_ITEMS,
  PLACEMENT_HISTORY,
  REFERENCES_NOTE,
  SMALL_IMAGE_MAX_SIDE,
} from "./constants";
import { creditBalance, creditsOf } from "./credits";
import { AiError, toUserMessage } from "./errors";
import { moderate } from "./moderation";
import {
  buildAnimationPrompt,
  buildComposePrompt,
  buildEditReviewPrompt,
  buildImagePrompt,
  buildPlacementPrompt,
  buildPlanPrompt,
  buildRedrawPrompt,
  buildRedrawReferences,
  buildSetPrompt,
  buildSheetRedrawPrompt,
  clampAnimationPlan,
  clampRect,
  closestAspectRatio,
  sheetLayout,
  type SheetLayout,
} from "./helpers";
import { getAiProvider } from "./provider";
import { renderAnimation, type AnimationInput } from "./animation";
import { fromPictures, type Picture } from "./pictures";
import { billOnSuccess } from "./usage";
import type {
  AiResult,
  AnimationPlan,
  ChatMessage,
  EditPlan,
  EditReview,
  GeneratedImage,
  PlacementPlan,
  Rect,
  SentMessage,
} from "./types";
import { MAX_OBJECTS } from "@/lib/edit/constants";
import { unionOf } from "@/lib/edit/raster";
import { requireUser } from "@/lib/auth/session";
import { MAX_PIGXEL_SIZE } from "@/lib/pigxel-file/format";
import { createClient } from "@/lib/supabase/server";

const PNG_DATA_URL = /^data:image\/png;base64,([A-Za-z0-9+/=]{1,2000000})$/;
const IMAGE_DATA_URL =
  /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]{1,2000000})$/;

const validSize = (n: number) =>
  Number.isInteger(n) && n > 0 && n <= MAX_PIGXEL_SIZE;

function extraPictures(
  references: string[],
  original: string,
): GeneratedImage[] | null {
  if (!Array.isArray(references) || references.length > MAX_REFERENCES)
    return null;
  const parsed = [...(original ? [original] : []), ...references].map((r) =>
    IMAGE_DATA_URL.exec(String(r)),
  );
  if (parsed.some((p) => !p)) return null;
  return parsed.map((p) => ({ mimeType: p![1]!, base64: p![2]! }));
}

/** Runs an AI step after checking the balance and screening what the person typed. */
async function attempt<T>(
  label: string,
  typed: string[],
  run: () => Promise<T>,
) {
  try {
    const balance = await creditBalance();
    if (balance.limit === 0)
      throw new AiError("paid_only", "The AI helper is for paid plans.");
    if (balance.left <= 0)
      throw new AiError("no_credits", "No AI tokens left.");
    await moderate(typed, (await requireUser()).id);
    return { ok: true, value: await run() } as const;
  } catch (e) {
    console.error(`[ai] ${label} failed:`, e);
    return { ok: false, error: toUserMessage(e) } as const;
  }
}

export async function sendMessage(
  sent: SentMessage[],
): Promise<AiResult<ChatMessage>> {
  await requireUser();
  const messages: ChatMessage[] = [];
  for (const message of Array.isArray(sent) ? sent : []) {
    const references = fromPictures(message.references);
    if (!references)
      return { ok: false, error: "Those references cannot be used." };
    messages.push({
      ...message,
      references: references.length ? references : undefined,
    });
  }
  const typed =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  return attempt("sendMessage", [typed], async () => {
    const ai = getAiProvider();
    const recent = messages.slice(-MAX_HISTORY);
    if (recent.some((m) => m.references && !extraPictures(m.references, "")))
      throw new AiError("failed", "Those references cannot be used.");
    const route = await ai.route(recent);
    if (route.intent === "chat") {
      return { role: "assistant", content: await ai.chat(recent) };
    }
    return {
      role: "assistant",
      content: `${route.intent}: ${route.subject}`,
      action: {
        kind: route.intent,
        request: [
          route.subject,
          `User's latest request: ${typed.replace(REFERENCES_NOTE, "").trim()}`,
        ].join("\n"),
        where: route.where,
        count: route.count,
        name: route.name,
        frames: route.frames,
        items: route.items,
        composition: route.composition,
        style: route.style,
      },
    };
  });
}

export async function generateImage(args: {
  subject: string;
  width: number;
  height: number;
  references?: Picture[];
  composition?: "sprite" | "scene";
  style?: string;
}): Promise<AiResult<string>> {
  await requireUser();
  const { subject, width, height } = args;
  const composition = args.composition ?? "sprite";
  const style = args.style ?? "";
  const references = fromPictures(args.references);
  const pictures = (references ?? []).map((r) => IMAGE_DATA_URL.exec(r));
  if (
    !references ||
    typeof subject !== "string" ||
    !subject.trim() ||
    !validSize(width) ||
    !validSize(height) ||
    pictures.length > MAX_REFERENCES ||
    pictures.some((p) => !p)
  ) {
    return { ok: false, error: "That area cannot be used for a picture." };
  }
  return attempt("generateImage", [subject], async () => {
    const { mimeType, base64 } = await getAiProvider().generate(
      buildImagePrompt(
        subject,
        width,
        height,
        pictures.length > 0,
        composition,
        style,
      ),
      closestAspectRatio(width, height),
      Math.max(width, height) <= SMALL_IMAGE_MAX_SIDE,
      pictures.map((p) => ({ mimeType: p![1]!, base64: p![2]! })),
    );
    return `data:${mimeType};base64,${base64}`;
  });
}

export async function redrawArea(args: {
  request: string;
  picture: string;
  width: number;
  height: number;
  references?: Picture[];
  original?: string;
}): Promise<AiResult<string>> {
  await requireUser();
  const { request, width, height } = args;
  const original = args.original ?? "";
  const png = PNG_DATA_URL.exec(String(args.picture))?.[1];
  const references = fromPictures(args.references);
  const extra = references && extraPictures(references, original);
  if (!references || !extra)
    return { ok: false, error: "Those references cannot be used." };
  if (
    typeof request !== "string" ||
    !request.trim() ||
    !png ||
    !validSize(width) ||
    !validSize(height)
  ) {
    return { ok: false, error: "That area cannot be redrawn." };
  }
  return attempt("redrawArea", [request], async () => {
    const ai = getAiProvider();
    const prompt = buildRedrawPrompt(request, width, height);
    const reference = { mimeType: "image/png", base64: png };
    const aspect = closestAspectRatio(width, height);
    const small = Math.max(width, height) <= SMALL_IMAGE_MAX_SIDE;
    const { mimeType, base64 } = extra.length
      ? await ai.generate(
          `${prompt} ${buildRedrawReferences("the pixel art to edit", !!original, references.length)}`,
          aspect,
          small,
          [reference, ...extra],
        )
      : await ai.redraw(prompt, reference, aspect, small);
    return `data:${mimeType};base64,${base64}`;
  });
}

export async function suggestComposition(args: {
  subject: string;
  tile: string;
  width: number;
  height: number;
}): Promise<AiResult<Rect>> {
  await requireUser();
  const { subject, width, height } = args;
  const png = PNG_DATA_URL.exec(String(args.tile))?.[1];
  if (
    typeof subject !== "string" ||
    !subject.trim() ||
    !png ||
    !validSize(width) ||
    !validSize(height)
  ) {
    return { ok: false, error: "The tile could not be analysed." };
  }
  return attempt("suggestComposition", [subject], async () => {
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
  references?: Picture[];
  style?: string;
}): Promise<AiResult<EditPlan>> {
  await requireUser();
  const { request, width, height } = args;
  const png = PNG_DATA_URL.exec(args.tile)?.[1];
  const sent = fromPictures(args.references);
  const references = sent && extraPictures(sent, "");
  if (!references)
    return { ok: false, error: "Those references cannot be used." };
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

  return attempt("planEdit", [request], async () => {
    const reply = await getAiProvider().plan(
      buildPlanPrompt({
        request: args.style?.trim()
          ? `${request}\nRequested visual style: ${args.style}`
          : request,
        width,
        height,
        objects: args.objects,
        layers: args.layers,
        selection: args.selection,
      }),
      [{ mimeType: "image/png", base64: png! }, ...references],
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
    const keep = reply.keep
      .map((i) => args.objects[i])
      .filter((r): r is Rect => !!r);
    const objects = reply.objects.filter((i) => !!args.objects[i]);
    return {
      objects,
      source,
      target: keep.length ? source : placed,
      keep,
      instruction: `${reply.instruction}\nUser request (do not discard its constraints): ${request}${args.style?.trim() ? `\nRequested visual style: ${args.style}` : ""}`,
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

  return attempt("planPlacement", [args.subject, args.where], async () => {
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

  return attempt("planAnimation", [request], async () => {
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
  return attempt("reviewEdit", [args.request], () =>
    getAiProvider().reviewEdit(
      buildEditReviewPrompt(
        args.request.slice(0, 6000),
        String(args.instruction ?? "").slice(0, 3000),
      ),
      { mimeType: "image/png", base64: before },
      { mimeType: "image/png", base64: after },
    ),
  );
}

export async function generateSet(args: {
  style?: string;
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
  return attempt("generateSet", subjects, async () => {
    const layout = sheetLayout(subjects.length, args.cellW, args.cellH);
    const { mimeType, base64 } = await getAiProvider().generate(
      buildSetPrompt({
        subjects: subjects.map((s) => s.slice(0, 300)),
        cellW: args.cellW,
        cellH: args.cellH,
        layout,
        style: args.style,
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
  references?: Picture[];
  original?: string;
}): Promise<AiResult<{ image: string; layout: SheetLayout }>> {
  await requireUser();
  const png = PNG_DATA_URL.exec(args.sheet)?.[1];
  const sent = fromPictures(args.references);
  const references = sent ?? [];
  const original = args.original ?? "";
  const extra = sent && extraPictures(references, original);
  const valid =
    extra &&
    typeof args.instruction === "string" &&
    args.instruction.trim() &&
    png &&
    Number.isInteger(args.count) &&
    args.count >= 2 &&
    args.count <= MAX_FRAMES &&
    validSize(args.cellW) &&
    validSize(args.cellH);
  if (!valid) return { ok: false, error: "Those frames cannot be redrawn." };
  return attempt("redrawFrames", [args.instruction], async () => {
    const layout = sheetLayout(args.count, args.cellW, args.cellH);
    const ai = getAiProvider();
    const prompt = buildSheetRedrawPrompt({
      instruction: args.instruction.slice(0, 1000),
      count: args.count,
      cellW: args.cellW,
      cellH: args.cellH,
      layout,
    });
    const sheet = { mimeType: "image/png", base64: png! };
    const { mimeType, base64 } = extra!.length
      ? await ai.generate(
          `${prompt} ${buildRedrawReferences("the sprite sheet to edit", !!original, references.length)}`,
          layout.aspectRatio,
          false,
          [sheet, ...extra!],
        )
      : await ai.redraw(prompt, sheet, layout.aspectRatio, false);
    return { image: `data:${mimeType};base64,${base64}`, layout };
  });
}

export async function generateAnimation(
  args: AnimationInput,
): Promise<AiResult<{ image: string; frames: string[] }>> {
  await requireUser();
  const valid =
    typeof args.subject === "string" &&
    args.subject.trim() &&
    Array.isArray(args.poses) &&
    args.poses.length >= 2 &&
    args.poses.length <= MAX_FRAMES &&
    args.poses.every((p) => typeof p === "string" && p.trim()) &&
    validSize(args.cellW) &&
    validSize(args.cellH) &&
    (args.sheet === null || PNG_DATA_URL.test(args.sheet)) &&
    (args.reference === null || PNG_DATA_URL.test(args.reference)) &&
    (!args.anchor || ["ground", "body", "fixed"].includes(args.anchor)) &&
    (!args.composition || ["sprite", "scene"].includes(args.composition));
  if (!valid) return { ok: false, error: "That animation cannot be drawn." };
  return attempt("generateAnimation", [args.subject, ...args.poses], () =>
    billOnSuccess(() => renderAnimation(getAiProvider(), args)),
  );
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
  resetsAt: string | null;
}> {
  await requireUser();
  const { limit, left, resetsAt } = await creditBalance();
  return { limit, left: Math.floor(left), resetsAt };
}
