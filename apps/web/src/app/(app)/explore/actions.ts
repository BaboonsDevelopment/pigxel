"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Likes a published art, or takes the like back. */
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
  refresh();
  return {};
}
