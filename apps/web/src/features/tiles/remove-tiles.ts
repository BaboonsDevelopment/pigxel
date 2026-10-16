import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { removeAllVersions } from "@/features/versions/server";

const BATCH = 200;

const MAX_BATCHES = 20;

/**
 * Deletes tiles for good: their saved versions, then their .pigxel files,
 * and the rows (with everything that cascades from them) only once the files
 * are gone. A failure leaves the row, so the delete can simply be tried
 * again and no file is left behind. Returns an error message, or null.
 */
export async function removeTiles(
  supabase: SupabaseClient,
  tiles: { id: string; user_id: string }[],
): Promise<string | null> {
  if (!tiles.length) return null;
  const ids = tiles.map((tile) => tile.id);
  if (isSupabaseAdminConfigured()) {
    const versions = await removeAllVersions(createAdminClient(), ids);
    if (versions) return versions;
  }
  const files = await supabase.storage
    .from("tiles")
    .remove(tiles.map((tile) => `${tile.user_id}/${tile.id}.pigxel`));
  if (files.error) return files.error.message;
  const removed = await supabase.from("tiles").delete().in("id", ids);
  return removed.error?.message ?? null;
}

/**
 * Deletes projects left in the Trash, which Pigxel no longer has: deleting
 * a project now removes it at once. Runs daily until none are left.
 */
export async function purgeTrashedTiles(): Promise<{
  purged: number;
  failed: boolean;
}> {
  let purged = 0;
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const result = await purgeBatch();
    purged += result.purged;
    if (result.failed) return { purged, failed: true };
    if (result.purged < BATCH) break;
  }
  return { purged, failed: false };
}

async function purgeBatch(): Promise<{ purged: number; failed: boolean }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tiles")
    .select("id, user_id")
    .not("deleted_at", "is", null)
    .limit(BATCH);
  if (error) {
    console.error("Couldn’t list trashed projects:", error.message);
    return { purged: 0, failed: true };
  }
  if (!data.length) return { purged: 0, failed: false };
  const failure = await removeTiles(supabase, data);
  if (failure) {
    console.error("Couldn’t delete trashed projects:", failure);
    return { purged: 0, failed: true };
  }
  return { purged: data.length, failed: false };
}
