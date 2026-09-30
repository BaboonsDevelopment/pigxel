import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toSummary, type CloudTileSummary } from "./cloud";

/**
 * The signed-in person's most recent cloud tiles (up to `limit`) for
 * server-rendered pages; empty if unavailable.
 */
export async function listCloudTilesOnServer(
  userId: string,
  limit = 200,
): Promise<CloudTileSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tiles")
    .select("id, user_id, name, width, height, thumbnail, updated_at")
    // Others' public tiles are readable too; this list is only your own.
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  // Also covers the tiles table not being set up yet.
  if (error || !data) return [];
  return data.map(toSummary);
}
