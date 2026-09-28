"use server";

import { getAiProvider } from "@/lib/ai/provider";
import type { ChatMessage } from "@/lib/ai/types";
import { requireUser } from "@/lib/auth/session";

/** Routes the latest message to generation or editing and returns the reply. */
export async function sendMessage(
  messages: ChatMessage[],
): Promise<ChatMessage> {
  await requireUser();
  const ai = getAiProvider();
  const last = messages.at(-1)?.content ?? "";

  if ((await ai.route(last)) === "generate") {
    const { mimeType, base64 } = await ai.generate(last);
    return {
      role: "assistant",
      content: "Here is your picture.",
      image: `data:${mimeType};base64,${base64}`,
    };
  }
  return { role: "assistant", content: await ai.edit(messages) };
}
