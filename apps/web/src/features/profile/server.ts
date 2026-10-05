import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { profileOf, type Profile } from "@/lib/auth/session";
import { getCurrentPlan } from "@/features/billing/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  PROFILE_COLUMNS,
  avatarUrlOf,
  toArtistProfile,
  type ArtistProfile,
  type ProfileRow,
  type ProfileTile,
  type PublicTile,
  type Visibility,
} from "./profile";

type TileRow = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnail: string | null;
  visibility: Visibility;
  pin_order: number | null;
  updated_at: string;
};

export const getOwnProfile = cache(
  async (userId: string): Promise<ArtistProfile | null> => {
    if (!isSupabaseConfigured()) return null;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle<ProfileRow>();
    if (error) console.error("Couldn’t load your profile:", error.message);
    return error || !data ? null : toArtistProfile(data);
  },
);

export async function sidebarProfile(user: User): Promise<Profile> {
  const [own, plan] = await Promise.all([
    getOwnProfile(user.id),
    getCurrentPlan(user.id),
  ]);
  const fallback = { ...profileOf(user), plan: plan.name };
  return own
    ? {
        ...fallback,
        name: own.name,
        avatarUrl: own.avatarUrl,
        username: own.username,
      }
    : fallback;
}

type ProfileLookup =
  | { kind: "found"; profile: ArtistProfile }
  | { kind: "private" }
  | { kind: "missing" };

export async function findProfile(username: string): Promise<ProfileLookup> {
  if (!isSupabaseConfigured()) return { kind: "missing" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("username", username)
    .maybeSingle<ProfileRow>();
  if (error) throw new Error(`Couldn’t load @${username}: ${error.message}`);
  if (data) return { kind: "found", profile: toArtistProfile(data) };
  const { data: isPrivate, error: rpcError } = await supabase.rpc(
    "profile_is_private",
    { name: username },
  );
  if (rpcError)
    throw new Error(`Couldn’t load @${username}: ${rpcError.message}`);
  return isPrivate === true ? { kind: "private" } : { kind: "missing" };
}

export async function listProfileTiles(
  userId: string,
): Promise<{ tiles: ProfileTile[]; count: number }> {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("tiles")
    .select(
      "id, name, width, height, thumbnail, visibility, pin_order, updated_at",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .order("pin_order", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(120);
  if (error) throw new Error(`Couldn’t load arts: ${error.message}`);
  return {
    count: count ?? data.length,
    tiles: (data as TileRow[]).map(toProfileTile),
  };
}

const toProfileTile = (row: TileRow): ProfileTile => ({
  id: row.id,
  name: row.name,
  width: row.width,
  height: row.height,
  thumbnail: row.thumbnail,
  visibility: row.visibility,
  pinOrder: row.pin_order,
  updatedAt: row.updated_at,
});

const DAY = 24 * 60 * 60 * 1000;

type PublicTileRow = TileRow & {
  user_id: string;
  author: Pick<
    ProfileRow,
    | "username"
    | "display_name"
    | "avatar_kind"
    | "avatar_path"
    | "provider_avatar_url"
  >;
  likes: { count: number }[];
  mine?: { user_id: string }[];
};

const PUBLIC_TILE_COLUMNS =
  "id, user_id, name, width, height, thumbnail, visibility, pin_order, updated_at, author:profiles!tiles_user_id_profiles_fkey!inner(username, display_name, avatar_kind, avatar_path, provider_avatar_url), likes:tile_likes(count)";

export async function listPublicTiles(
  from: number,
  limit: number,
  days: number,
  viewerId: string | null,
): Promise<{ tiles: PublicTile[]; count: number }> {
  const supabase = await createClient();
  const query = supabase
    .rpc(
      "popular_tiles",
      { since: new Date(Date.now() - days * DAY).toISOString() },
      { count: "exact" },
    )
    .select(
      viewerId
        ? `${PUBLIC_TILE_COLUMNS}, mine:tile_likes(user_id)`
        : PUBLIC_TILE_COLUMNS,
    );
  const { data, count, error } = await (
    viewerId ? query.eq("mine.user_id", viewerId) : query
  ).range(from, from + limit - 1);
  if (error) throw new Error(`Couldn’t load public arts: ${error.message}`);
  const rows = data as unknown as PublicTileRow[];
  return {
    count: count ?? rows.length,
    tiles: rows.map(toPublicTile),
  };
}

const toPublicTile = (row: PublicTileRow): PublicTile => ({
  ...toProfileTile(row),
  author: {
    id: row.user_id,
    username: row.author.username,
    name: row.author.display_name,
    avatarUrl: avatarUrlOf(row.author),
  },
  likes: row.likes[0]?.count ?? 0,
  liked: Boolean(row.mine?.length),
});

export async function getPublicTile(
  id: string,
  viewerId: string | null,
): Promise<PublicTile | null> {
  const supabase = await createClient();
  const query = supabase
    .from("tiles")
    .select(
      viewerId
        ? `${PUBLIC_TILE_COLUMNS}, mine:tile_likes(user_id)`
        : PUBLIC_TILE_COLUMNS,
    )
    .eq("id", id)
    .eq("visibility", "public");
  const { data, error } = await (
    viewerId ? query.eq("mine.user_id", viewerId) : query
  ).maybeSingle();
  if (error) throw new Error(`Couldn’t load this art: ${error.message}`);
  return data ? toPublicTile(data as unknown as PublicTileRow) : null;
}

export async function getFollowStats(
  profileId: string,
  viewerId: string | null,
): Promise<{ followers: number; following: boolean }> {
  const supabase = await createClient();
  const [all, mine] = await Promise.all([
    // Guests may only read followee_id, which is enough to count.
    supabase
      .from("follows")
      .select("followee_id", { count: "exact", head: true })
      .eq("followee_id", profileId),
    viewerId
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("followee_id", profileId)
          .eq("follower_id", viewerId)
          .maybeSingle()
      : { data: null },
  ]);
  return { followers: all.count ?? 0, following: Boolean(mine.data) };
}

export type ProfileActivity = {
  days: Map<string, number>;
  today: number;
};

export async function getProfileActivity(
  profileId: string,
): Promise<ProfileActivity> {
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("profile_activity", {
    profile_id: profileId,
  });
  if (error || !data) return { days: new Map(), today };
  return {
    days: new Map(
      (data as { day: string; arts: number }[]).map((row) => [
        row.day,
        row.arts,
      ]),
    ),
    today,
  };
}
