import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toSummary, type CloudTileSummary } from "./cloud";

/** The signed-in person's cloud tiles for server-rendered pages; empty if unavailable. */
export async function listCloudTilesOnServer(): Promise<CloudTileSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tiles")
    .select("id, user_id, name, width, height, thumbnail, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  // Also covers the tiles table not being set up yet.
  if (error || !data) return [];
  return data.map(toSummary);
}
