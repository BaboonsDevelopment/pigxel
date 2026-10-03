"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { MAX_PINS, type Visibility } from "@/lib/profile/profile";
import { createClient } from "@/lib/supabase/server";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = { error?: string };

const done = (): Result => {
  refresh();
  return {};
};

export async function setTileVisibility(
  tileId: string,
  visibility: Visibility,
): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(tileId) || !["public", "private"].includes(visibility))
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tiles")
      .update({ visibility })
      .eq("id", tileId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t change this art. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return done();
}

export async function setTilePinned(
  tileId: string,
  pinned: boolean,
): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    let pinOrder: number | null = null;
    if (pinned) {
      const { data, error } = await supabase
        .from("tiles")
        .select("pin_order")
        .eq("user_id", user.id)
        .not("pin_order", "is", null);
      if (error) return { error: "Couldn’t pin this art. Try again." };
      const taken = new Set(data.map((row) => row.pin_order as number));
      pinOrder =
        Array.from({ length: MAX_PINS }, (_, i) => i + 1).find(
          (slot) => !taken.has(slot),
        ) ?? null;
      if (!pinOrder)
        return {
          error: `You can pin up to ${MAX_PINS} arts. Unpin one first.`,
        };
    }
    const { error } = await supabase
      .from("tiles")
      .update({ pin_order: pinOrder })
      .eq("id", tileId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t change this art. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return done();
}

export async function setFollowing(
  profileId: string,
  following: boolean,
): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(profileId) || profileId === user.id)
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = following
      ? await supabase
          .from("follows")
          .upsert(
            { followee_id: profileId },
            { onConflict: "follower_id,followee_id", ignoreDuplicates: true },
          )
      : await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("followee_id", profileId);
    if (error) return { error: "Couldn’t change that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return done();
}
