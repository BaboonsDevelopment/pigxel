import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toSummary, type CloudTileSummary } from "./cloud";

export async function listCloudTilesOnServer(
  userId: string,
  limit = 200,
  from = 0,
  folderId: string | null = null,
): Promise<CloudTileSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const query = supabase
    .from("tiles")
    .select("id, user_id, name, width, height, thumbnail, updated_at")
    .eq("user_id", userId);
  const { data, error } = await (
    folderId ? query.eq("folder_id", folderId) : query
  )
    .order("updated_at", { ascending: false })
    .order("id")
    .range(from, from + limit - 1);
  if (error || !data) return [];
  return data.map(toSummary);
}
