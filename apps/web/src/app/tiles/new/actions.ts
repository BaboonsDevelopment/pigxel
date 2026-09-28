"use server";

import { getAiProvider } from "@/lib/ai/provider";
import type { ChatMessage } from "@/lib/ai/types";
import { requireUser } from "@/lib/auth/session";

export async function sendMessage(messages: ChatMessage[]): Promise<string> {
  await requireUser();
  return getAiProvider().reply(messages);
}
