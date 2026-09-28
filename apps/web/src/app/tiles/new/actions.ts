"use server";

import { buildImagePrompt, closestAspectRatio } from "@/lib/ai/helpers";
import { getAiProvider } from "@/lib/ai/provider";
import type { ChatMessage } from "@/lib/ai/types";
import { requireUser } from "@/lib/auth/session";

const MAX_GRID = 256;

/**
 * Routes the latest message: edits are answered right away, while a request
 * to create asks the user where to draw before anything is generated.
 */
export async function sendMessage(
  messages: ChatMessage[],
): Promise<ChatMessage> {
  await requireUser();
  const ai = getAiProvider();
  const last = messages.at(-1)?.content ?? "";

  const route = await ai.route(last);
  if (route.intent === "generate") {
    return {
      role: "assistant",
      content: "Where should I draw it?",
      create: { subject: route.subject },
    };
  }
  return { role: "assistant", content: await ai.edit(messages) };
}

/** Draws `subject` as pixel art for a `width × height` grid; returns a data URL. */
export async function generateImage(
  subject: string,
  width: number,
  height: number,
): Promise<string> {
  await requireUser();
  const valid = (n: number) => Number.isInteger(n) && n > 0 && n <= MAX_GRID;
  if (!subject.trim() || !valid(width) || !valid(height)) {
    throw new Error("Invalid generation request.");
  }

  const { mimeType, base64 } = await getAiProvider().generate(
    buildImagePrompt(subject, width, height),
    closestAspectRatio(width, height),
  );
  return `data:${mimeType};base64,${base64}`;
}
