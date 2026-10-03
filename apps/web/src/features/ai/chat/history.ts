import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type SavedMessage = {
  role: "user" | "assistant";
  content: string;
  picture?: string;
};

type SavedChat = { messages: SavedMessage[] };

const MAX_MESSAGES = 200;
const MAX_CONTENT = 4000;

const TABLE = "tile_chats";

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
