import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Folder } from "./folders";
import type { Label } from "./labels";

type FolderRow = {
  id: string;
  name: string;
  count: { count: number }[];
  recent: {
    id: string;
    name: string;
    width: number;
    height: number;
    thumbnail: string | null;
    updated_at: string;
  }[];
};

export async function listFolders(userId: string): Promise<Folder[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("folders")
    .select(
      "id, name, count:tiles(count), recent:tiles(id, name, width, height, thumbnail, updated_at)",
    )
    .eq("user_id", userId)
    .order("created_at")
    .order("updated_at", { referencedTable: "recent", ascending: false })
    .limit(3, { referencedTable: "recent" });
  if (error) throw new Error(`Couldn’t load folders: ${error.message}`);
  return (data as unknown as FolderRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    count: row.count[0]?.count ?? 0,
    projects: row.recent.map((tile) => ({
      id: tile.id,
      name: tile.name,
      width: tile.width,
      height: tile.height,
      thumbnail: tile.thumbnail,
      at: Date.parse(tile.updated_at),
    })),
  }));
}

export async function listLabels(userId: string): Promise<Label[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("labels")
    .select("id, name, color")
    .eq("user_id", userId)
    .order("name");
  if (error) throw new Error(`Couldn’t load labels: ${error.message}`);
  return data;
}
