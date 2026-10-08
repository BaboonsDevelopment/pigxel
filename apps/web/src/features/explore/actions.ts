"use server";

import { getUser, requireUser } from "@/lib/auth/session";
import type { ProfileTile, PublicTile } from "@/features/profile/profile";
import {
  countPublicTilesByTag,
  listProfileTiles,
  listPublicTiles,
} from "@/features/profile/server";
import { createClient } from "@/lib/supabase/server";
import {
  DESCRIPTION_MAX,
  FEEDS,
  PAGE_SIZE,
  PERIODS,
  QUERY_MAX,
  SIZES,
  SORTS,
  TAGS,
  type ExploreFilters,
} from "./constants";
import { findArtists, type ArtistResult } from "@/features/search/server";
import { COMMENT_COLUMNS, COMMENT_MAX, type ArtComment } from "./comments";
import { toComment } from "./server";
import { requestReview } from "@/features/moderation/request";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function artFilter(filters: ExploreFilters) {
  const days = PERIODS.find((p) => p.value === filters?.period)?.days;
  const range = SIZES.find((s) => s.value === filters?.size);
  if (
    days === undefined ||
    !range ||
    typeof filters.animated !== "boolean" ||
    typeof filters.query !== "string" ||
    !SORTS.some((s) => s.value === filters.sort) ||
    !FEEDS.some((s) => s.value === filters.feed) ||
    !Array.isArray(filters.tags) ||
    filters.tags.some((tag) => !(TAGS as readonly string[]).includes(tag))
  )
    return null;
  const user = await getUser();
  if ((filters.sort === "liked" || filters.feed === "following") && !user)
    return null;
  return {
    days,
    user,
    filter: {
      order:
        filters.sort === "recent" || filters.sort === "az"
          ? filters.sort
          : ("relevance" as const),
      likedBy: filters.sort === "liked" ? user?.id : undefined,
      followedBy: filters.feed === "following" ? user?.id : undefined,
      min: range.min,
      max: range.max,
      animated: filters.animated,
      query: filters.query.trim().slice(0, QUERY_MAX),
    },
  };
}

export async function loadPopularTiles(
  from: number,
  filters: ExploreFilters,
): Promise<{ tiles: PublicTile[]; count: number }> {
  if (!Number.isInteger(from) || from < 0) return { tiles: [], count: 0 };
  const valid = await artFilter(filters);
  if (!valid) return { tiles: [], count: 0 };
  return listPublicTiles(
    from,
    PAGE_SIZE,
    valid.days,
    valid.user?.id ?? null,
    filters.tags,
    valid.filter,
  );
}

export async function loadTagCounts(
  filters: ExploreFilters,
): Promise<Record<string, number> | null> {
  const valid = await artFilter(filters);
  if (!valid) return null;
  return countPublicTilesByTag(valid.days, TAGS, valid.filter);
}

export async function loadArtists(query: string): Promise<ArtistResult[]> {
  if (typeof query !== "string") return [];
  return findArtists(query);
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

export async function recordDownload(tileId: string): Promise<number | null> {
  if (!UUID.test(tileId)) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("record_tile_download", {
      tile: tileId,
    });
    return error ? null : Number(data);
  } catch {
    return null;
  }
}

export async function setTileSaved(
  tileId: string,
  saved: boolean,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = saved
      ? await supabase
          .from("saved_tiles")
          .upsert(
            { tile_id: tileId },
            { onConflict: "user_id,tile_id", ignoreDuplicates: true },
          )
      : await supabase
          .from("saved_tiles")
          .delete()
          .eq("user_id", user.id)
          .eq("tile_id", tileId);
    if (error) return { error: "Couldn’t change that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function postComment(
  tileId: string,
  body: string,
): Promise<{ comment?: ArtComment; error?: string }> {
  await requireUser();
  const text = body.trim();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  if (!text || text.length > COMMENT_MAX)
    return { error: `Keep it between 1 and ${COMMENT_MAX} characters.` };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tile_comments")
      .insert({ tile_id: tileId, body: text })
      .select(COMMENT_COLUMNS)
      .single();
    if (error) return { error: "Couldn’t post that. Try again." };
    return {
      comment: toComment(data as unknown as Parameters<typeof toComment>[0]),
    };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
}

export async function deleteComment(
  commentId: string,
): Promise<{ error?: string }> {
  await requireUser();
  if (!UUID.test(commentId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tile_comments")
      .delete()
      .eq("id", commentId);
    if (error) return { error: "Couldn’t delete that. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

async function saveArtDetails(
  tileId: string,
  tags: string[],
  description: string,
  publish: boolean,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const text = description.trim();
  const chosen = [...new Set(tags)];
  if (
    !UUID.test(tileId) ||
    chosen.some((tag) => !(TAGS as readonly string[]).includes(tag))
  )
    return { error: "Invalid request." };
  if (text.length > DESCRIPTION_MAX)
    return {
      error: `Keep the description under ${DESCRIPTION_MAX} characters.`,
    };
  try {
    const supabase = await createClient();
    const query = supabase
      .from("tiles")
      .update({ tags: chosen, description: text || null })
      .eq("id", tileId)
      .eq("user_id", user.id);
    const { error } = await (publish
      ? query
      : query.eq("visibility", "public"));
    if (error) return { error: "Couldn’t save this art. Try again." };
    if (publish) await requestReview(supabase, tileId, user.id);
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}

export async function publishArt(
  tileId: string,
  tags: string[],
  description: string,
): Promise<{ error?: string }> {
  return saveArtDetails(tileId, tags, description, true);
}

export async function updateArtDetails(
  tileId: string,
  tags: string[],
  description: string,
): Promise<{ error?: string }> {
  return saveArtDetails(tileId, tags, description, false);
}

export async function loadArtDetails(tileId: string): Promise<{
  published: boolean;
  tags: string[];
  description: string;
} | null> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tiles")
    .select("visibility, review, tags, description")
    .eq("id", tileId)
    .eq("user_id", user.id)
    .maybeSingle<{
      visibility: string;
      review: string | null;
      tags: string[];
      description: string | null;
    }>();
  if (!data) return null;
  return {
    published: data.visibility === "public" || data.review === "pending",
    tags: data.tags,
    description: data.description ?? "",
  };
}

export async function unpublishArt(
  tileId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!UUID.test(tileId)) return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tiles")
      .update({ visibility: "private", review: null })
      .eq("id", tileId)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn’t remove this art from Explore." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  return {};
}
