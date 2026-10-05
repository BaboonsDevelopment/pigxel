"use server";

import { getUser, requireUser } from "@/lib/auth/session";
import type { ProfileTile, PublicTile } from "@/features/profile/profile";
import { listProfileTiles, listPublicTiles } from "@/features/profile/server";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, PERIODS, type Period } from "./constants";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadPopularTiles(
  period: Period,
  from: number,
): Promise<PublicTile[]> {
  const days = PERIODS.find((p) => p.value === period)?.days;
  if (!days || !Number.isInteger(from) || from < 0) return [];
  const user = await getUser();
  const { tiles } = await listPublicTiles(
    from,
    PAGE_SIZE,
    days,
    user?.id ?? null,
  );
  return tiles;
}

export async function setTileLiked(
  tileId: string,
  liked: boolean,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = liked
      ? await supabase
          .from("tile_likes")
          .upsert(
            { tile_id: tileId },
            { onConflict: "user_id,tile_id", ignoreDuplicates: true },
          )
      : await supabase
          .from("tile_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("tile_id", tileId);
    if (error) return { error: "Couldn’t change that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function loadUnpublishedTiles(): Promise<ProfileTile[]> {
  const user = await requireUser();
  const { tiles } = await listProfileTiles(user.id);
  return tiles.filter((tile) => tile.visibility === "private");
}
