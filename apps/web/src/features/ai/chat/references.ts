import type { ChatMessage, TileAction } from "../types";

/** A follow-up edit keeps the last reference until a new drawing starts. */
export function referencesForAction(
  messages: ChatMessage[],
  action: TileAction,
): string[] {
  const latest = messages.at(-1);
  if (latest?.role === "user" && latest.references?.length)
    return latest.references;
  if (action.kind === "generate" || action.kind === "undo") return [];
  for (const message of messages.slice(0, -1).reverse()) {
    if (message.role !== "user") continue;
    if (message.references?.length) return message.references;
    if (message.action?.kind === "generate") return [];
  }
  return [];
}
