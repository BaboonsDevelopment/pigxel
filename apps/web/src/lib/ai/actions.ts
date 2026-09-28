"use server";

import { toUserMessage } from "@/lib/ai/errors";
import {
  buildComposePrompt,
  buildImagePrompt,
  clampRect,
  closestAspectRatio,
} from "@/lib/ai/helpers";
import { getAiProvider } from "@/lib/ai/provider";
import type { AiResult, ChatMessage, Rect } from "@/lib/ai/types";
import { requireUser } from "@/lib/auth/session";

const MAX_GRID = 256;
/** A PNG data URL of at most ~1.5 MB, capturing its base64 payload. */
const PNG_DATA_URL = /^data:image\/png;base64,([A-Za-z0-9+/=]{1,2000000})$/;

/**
 * Routes the latest message: edits are answered right away, while a request
 * to create comes back with its subject so the client can decide where to draw.
 */
export async function sendMessage(
  messages: ChatMessage[],
): Promise<AiResult<ChatMessage>> {
  await requireUser();
  try {
    const ai = getAiProvider();
    const route = await ai.route(messages.at(-1)?.content ?? "");
    if (route.intent === "generate") {
      return {
        ok: true,
        value: {
          role: "assistant",
          content: `Drawing: ${route.subject}`,
          create: { subject: route.subject },
        },
      };
    }
    const reply = await ai.edit(messages);
    return { ok: true, value: { role: "assistant", content: reply } };
  } catch (e) {
    console.error("[ai] sendMessage failed:", e);
    return { ok: false, error: toUserMessage(e) };
  }
}

/** Draws `subject` as pixel art for a `width × height` grid; returns a data URL. */
export async function generateImage(
  subject: string,
  width: number,
  height: number,
): Promise<AiResult<string>> {
  await requireUser();
  const valid = (n: number) => Number.isInteger(n) && n > 0 && n <= MAX_GRID;
  if (!subject.trim() || !valid(width) || !valid(height)) {
    return { ok: false, error: "That area cannot be used for a picture." };
  }

  try {
    const { mimeType, base64 } = await getAiProvider().generate(
      buildImagePrompt(subject, width, height),
      closestAspectRatio(width, height),
    );
    return { ok: true, value: `data:${mimeType};base64,${base64}` };
  } catch (e) {
    console.error("[ai] generateImage failed:", e);
    return { ok: false, error: toUserMessage(e) };
  }
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
  const valid = (n: number) => Number.isInteger(n) && n > 0 && n <= MAX_GRID;
  if (!subject.trim() || !png || !valid(width) || !valid(height)) {
    return { ok: false, error: "The tile could not be analysed." };
  }

  try {
    const rect = await getAiProvider().compose(
      buildComposePrompt(subject, width, height),
      { mimeType: "image/png", base64: png },
    );
    return { ok: true, value: clampRect(rect, width, height) };
  } catch (e) {
    console.error("[ai] suggestComposition failed:", e);
    return { ok: false, error: toUserMessage(e) };
  }
}
