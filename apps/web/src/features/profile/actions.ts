"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  MAX_PINS,
  type ArtsKind,
  type ArtsQuery,
  readArtsQuery,
  type ProfileTile,
  type Visibility,
} from "./profile";
import { listProfileArts } from "./server";
import { createClient } from "@/lib/supabase/server";
import { requestReview } from "@/features/moderation/request";
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
    if (visibility === "public") await requestReview(supabase, tileId, user.id);
    else {
      const { error } = await supabase
        .from("tiles")
        .update({ visibility, review: null })
        .eq("id", tileId)
        .eq("user_id", user.id);
      if (error) return { error: "Couldn’t change this art. Try again." };
    }
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

export async function reorderPins(ids: string[]): Promise<Result> {
  await requireUser();
  if (
    ids.length === 0 ||
    ids.length > MAX_PINS ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => UUID.test(id))
  )
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("reorder_pins", { ids });
    if (error) return { error: "Couldn’t reorder pinned arts. Try again." };
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

export async function reportProfile(profileId: string): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(profileId) || profileId === user.id)
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profile_reports")
      .insert({ profile_id: profileId });
    if (error && error.code !== "23505")
      return { error: "Couldn’t report that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function setBlocked(
  profileId: string,
  blocked: boolean,
): Promise<Result> {
  const user = await requireUser();
  if (!UUID.test(profileId) || profileId === user.id)
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = blocked
      ? await supabase
          .from("blocks")
          .upsert(
            { blocked_id: profileId },
            { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
          )
      : await supabase
          .from("blocks")
          .delete()
          .eq("blocker_id", user.id)
          .eq("blocked_id", profileId);
    if (error) return { error: "Couldn’t change that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return done();
}

export async function loadMoreProfileArts(
  profileId: string,
  kind: ArtsKind,
  from: number,
  query?: ArtsQuery,
): Promise<ProfileTile[]> {
  if (!UUID.test(profileId) || !Number.isInteger(from) || from < 0) return [];
  if (!["published", "drafts", "liked", "saved"].includes(kind)) return [];
  if (kind === "drafts" || kind === "saved") {
    const user = await requireUser();
    if (user.id !== profileId) return [];
  }
  try {
    return (
      await listProfileArts(
        profileId,
        kind,
        from,
        readArtsQuery(query?.sort, query?.tag ?? undefined),
      )
    ).tiles;
  } catch {
    return [];
  }
}
