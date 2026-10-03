import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * A tile's AI chat in Pigxel cloud (the tile_chats table), under the id kept
 * in the tile's file. Pictures are only named here (see pictures.ts). Row
 * level security keeps each person to their own chats, so this runs with the
 * signed-in browser session.
 */

type SavedMessage = {
  role: "user" | "assistant";
  content: string;
  /** The id of the message's picture in the browser's cache. */
  picture?: string;
};

type SavedChat = { messages: SavedMessage[] };

/** Most messages kept per tile; older ones drop off. */
const MAX_MESSAGES = 200;
/** Longest message kept. */
const MAX_CONTENT = 4000;

const TABLE = "tile_chats";

/** The tile's chat; empty when there is none yet or it can't be reached. */
export async function loadChat(tileId: string): Promise<SavedChat> {
  const empty: SavedChat = { messages: [] };
  if (!isSupabaseConfigured()) return empty;
  const { data, error } = await createClient()
    .from(TABLE)
    .select("messages")
    .eq("tile_id", tileId)
    .maybeSingle();
  if (error || !data) return empty;
  return { messages: Array.isArray(data.messages) ? data.messages : [] };
}

/** Saves the tile's chat, keeping its latest messages; false when it failed. */
export async function saveChat(
  tileId: string,
  chat: SavedChat,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const messages = chat.messages.slice(-MAX_MESSAGES).map((m) => ({
    ...m,
    content: m.content.slice(0, MAX_CONTENT),
  }));
  const { error } = await createClient().from(TABLE).upsert(
    {
      tile_id: tileId,
      messages,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tile_id" },
  );
  return !error;
}
