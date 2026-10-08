import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePigxel, PigxelFileError } from "@/lib/pigxel-file/format";
import { SWEEP_SIZE } from "./constants";
import { frameImages, isAllowed, worstFrame } from "./frames";
import { scoreImages } from "./nsfw";
import { checkedThumbnail } from "./thumbnail";

type Verdict = "approved" | "rejected" | "skipped";

type ReviewedTile = {
  id: string;
  user_id: string;
  name: string;
  visibility: string;
  review: string | null;
};

export async function reviewTile(tileId: string): Promise<Verdict> {
  const admin = createAdminClient();
  const startedAt = new Date().toISOString();
  const { data: tile, error } = await admin
    .from("tiles")
    .select("id, user_id, name, visibility, review")
    .eq("id", tileId)
    .maybeSingle<ReviewedTile>();
  if (error) throw new Error(`Couldn’t load tile ${tileId}: ${error.message}`);
  if (!tile || (tile.review !== "pending" && tile.visibility !== "public"))
    return "skipped";

  const file = await admin.storage
    .from("tiles")
    .download(`${tile.user_id}/${tile.id}.pigxel`);
  const missing = !!file.error && /not.?found/i.test(file.error.message);
  if (file.error && !missing)
    throw new Error(`Couldn’t read tile ${tileId}: ${file.error.message}`);

  let scores = null;
  let allowed = false;
  let thumbnail = null;
  try {
    if (file.data) {
      const doc = parsePigxel(await file.data.text());
      const frames = await scoreImages(frameImages(doc));
      scores = worstFrame(frames);
      allowed = isAllowed(frames);
      thumbnail = checkedThumbnail(doc);
    }
  } catch (error) {
    if (!(error instanceof PigxelFileError)) throw error;
  }

  const verdict = allowed ? "approved" : "rejected";
  let update = admin
    .from("tiles")
    .update({
      visibility: allowed ? "public" : "private",
      review: verdict,
      reviewed_at: startedAt,
      review_scores: scores,
      ...(allowed && { thumbnail }),
    })
    .eq("id", tile.id)
    .eq("visibility", tile.visibility);
  update =
    tile.review === null
      ? update.is("review", null)
      : update.eq("review", tile.review);
  const { data: changed, error: saveError } = await update.select("id");
  if (saveError)
    throw new Error(`Couldn’t save review of ${tileId}: ${saveError.message}`);
  if (!changed.length) return "skipped";

  if (!allowed && scores) {
    const { error: notifyError } = await admin.from("notifications").insert({
      user_id: tile.user_id,
      kind: "art_rejected",
      tile_id: tile.id,
      tile_name: tile.name,
    });
    if (notifyError)
      console.error(`Couldn’t notify about ${tileId}:`, notifyError.message);
  }
  return verdict;
}

export async function reviewDueTiles(): Promise<{
  reviewed: number;
  failed: number;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("tiles_due_for_review", {
    max_count: SWEEP_SIZE,
  });
  if (error) throw new Error(`Couldn’t find tiles to review: ${error.message}`);
  let failed = 0;
  for (const tileId of data as string[]) {
    try {
      await reviewTile(tileId);
    } catch (e) {
      failed++;
      console.error(`Couldn’t review ${tileId}:`, e);
    }
  }
  return { reviewed: (data as string[]).length - failed, failed };
}
