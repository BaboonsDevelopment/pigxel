import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type SavedArt = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnail: string | null;
  author: string;
  savedAt: string;
};

type SavedRow = {
  created_at: string;
  tile: {
    id: string;
    name: string;
    width: number;
    height: number;
    thumbnail: string | null;
    author: { username: string };
  };
};

export async function isTileSaved(
  userId: string,
  tileId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_tiles")
    .select("tile_id")
    .eq("user_id", userId)
    .eq("tile_id", tileId)
    .maybeSingle();
  return !error && !!data;
}

export async function listSavedArts(userId: string): Promise<SavedArt[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_tiles")
    .select(
      "created_at, tile:tiles!inner(id, name, width, height, thumbnail, author:profiles!tiles_user_id_profiles_fkey!inner(username))",
    )
    .eq("user_id", userId)
    .eq("tile.visibility", "public")
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw new Error(`Couldn’t load saved arts: ${error.message}`);
  return (data as unknown as SavedRow[]).map((row) => ({
    id: row.tile.id,
    name: row.tile.name,
    width: row.tile.width,
    height: row.tile.height,
    thumbnail: row.tile.thumbnail,
    author: row.tile.author.username,
    savedAt: row.created_at,
  }));
}
