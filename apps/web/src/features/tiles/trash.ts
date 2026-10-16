import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRASH_DAYS } from "./constants";
import { removeAllVersions } from "@/features/versions/server";

const BATCH = 200;

const MAX_BATCHES = 20;

export async function purgeExpiredTrash(): Promise<{
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
  const cutoff = new Date(Date.now() - TRASH_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("tiles")
    .select("id, user_id")
    .lt("deleted_at", cutoff)
    .limit(BATCH);
  if (error) {
    console.error("Couldn’t list expired trash:", error.message);
    return { purged: 0, failed: true };
  }
  if (!data.length) return { purged: 0, failed: false };
  const failure = await removeTiles(supabase, data);
  if (failure) {
    console.error("Couldn’t delete expired trash:", failure);
    return { purged: 0, failed: true };
  }
  return { purged: data.length, failed: false };
}

export async function removeTiles(
  supabase: ReturnType<typeof createAdminClient>,
  tiles: { id: string; user_id: string }[],
): Promise<string | null> {
  await removeAllVersions(
    supabase,
    tiles.map((tile) => tile.id),
  ).catch(() => {});
  const files = await supabase.storage
    .from("tiles")
    .remove(tiles.map((tile) => `${tile.user_id}/${tile.id}.pigxel`));
  if (files.error)
    console.error("Couldn’t remove tile files:", files.error.message);
  const removed = await supabase
    .from("tiles")
    .delete()
    .in(
      "id",
      tiles.map((tile) => tile.id),
    );
  return removed.error?.message ?? null;
}
