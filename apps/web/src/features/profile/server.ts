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
  review?: string | null;
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
      "id, name, width, height, thumbnail, visibility, review, pin_order, updated_at",
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
  visibility: row.review === "pending" ? "public" : row.visibility,
  inReview: row.review === "pending",
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
  > &
    Partial<Pick<ProfileRow, "bio">>;
  likes: { count: number }[];
  mine?: { user_id: string }[];
};

type ArtFilter = {
  min?: number;
  max?: number;
  animated?: boolean;
  query?: string;
  order?: "relevance" | "recent" | "az";
  likedBy?: string;
  followedBy?: string;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

const publicTiles = (
  supabase: Supabase,
  days: number,
  filter: ArtFilter,
  head = false,
) => {
  const since = new Date(days ? Date.now() - days * DAY : 0).toISOString();
  return filter.query
    ? supabase.rpc(
        "search_public_tiles",
        {
          query: filter.query,
          liked_since:
            filter.order === "recent" || filter.order === "az" || filter.likedBy
              ? null
              : since,
        },
        { count: "exact", head },
      )
    : supabase.rpc("popular_tiles", { since }, { count: "exact", head });
};

const PUBLIC_TILE_COLUMNS =
  "id, user_id, name, width, height, thumbnail, visibility, review, pin_order, updated_at, author:profiles!tiles_user_id_profiles_fkey!inner(username, display_name, avatar_kind, avatar_path, provider_avatar_url), likes:tile_likes(count)";

const ART_PAGE_COLUMNS = PUBLIC_TILE_COLUMNS.replace(
  "provider_avatar_url)",
  "provider_avatar_url, bio)",
);

async function followeesOf(supabase: Supabase, userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", userId);
  if (error) throw new Error(`Couldn’t load follows: ${error.message}`);
  return data.map((row) => row.followee_id as string);
}

export async function listPublicTiles(
  from: number,
  limit: number,
  days: number,
  viewerId: string | null,
  tags: string[] = [],
  filter: ArtFilter = {},
): Promise<{ tiles: PublicTile[]; count: number }> {
  const supabase = await createClient();
  const followees = filter.followedBy
    ? await followeesOf(supabase, filter.followedBy)
    : null;
  if (followees && !followees.length) return { tiles: [], count: 0 };
  const base = publicTiles(supabase, days, filter).select(
    filter.likedBy
      ? `${PUBLIC_TILE_COLUMNS}, mine:tile_likes!inner(user_id)`
      : viewerId
        ? `${PUBLIC_TILE_COLUMNS}, mine:tile_likes(user_id)`
        : PUBLIC_TILE_COLUMNS,
  );
  let query = tags.length ? base.overlaps("tags", tags) : base;
  if (filter.max)
    query = query.lte("width", filter.max).lte("height", filter.max);
  if (filter.min)
    query = query.or(`width.gte.${filter.min},height.gte.${filter.min}`);
  if (filter.animated) query = query.gt("frame_count", 1);
  const mine = filter.likedBy ?? viewerId;
  if (mine) query = query.eq("mine.user_id", mine);
  if (followees) query = query.in("user_id", followees);
  if (filter.order === "recent")
    query = query.order("published_at", { ascending: false }).order("id");
  if (filter.order === "az") query = query.order("name").order("id");
  const { data, count, error } = await query.range(from, from + limit - 1);
  if (error) throw new Error(`Couldn’t load public arts: ${error.message}`);
  const rows = data as unknown as PublicTileRow[];
  const ids = rows.map((row) => row.id);
  const [downloads, views] = await Promise.all([
    downloadCounts(ids),
    totals("tile_views", ids),
  ]);
  return {
    count: count ?? rows.length,
    tiles: rows.map((row) => ({
      ...toPublicTile(row),
      downloads: downloads.get(row.id) ?? 0,
      views: views.get(row.id) ?? 0,
    })),
  };
}

export async function listPublicTilesByIds(
  ids: string[],
  viewerId: string | null,
): Promise<PublicTile[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const base = supabase
    .from("tiles")
    .select(
      viewerId
        ? `${PUBLIC_TILE_COLUMNS}, mine:tile_likes(user_id)`
        : PUBLIC_TILE_COLUMNS,
    )
    .in("id", ids)
    .eq("visibility", "public");
  const { data, error } = await (viewerId
    ? base.eq("mine.user_id", viewerId)
    : base);
  if (error) throw new Error(`Couldn’t load arts: ${error.message}`);
  const rows = data as unknown as PublicTileRow[];
  const [downloads, views] = await Promise.all([
    downloadCounts(ids),
    totals("tile_views", ids),
  ]);
  const byId = new Map(
    rows.map((row) => [
      row.id,
      {
        ...toPublicTile(row),
        downloads: downloads.get(row.id) ?? 0,
        views: views.get(row.id) ?? 0,
      },
    ]),
  );
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export async function countPublicTilesByTag(
  days: number,
  tags: readonly string[],
  filter: ArtFilter = {},
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const followees = filter.followedBy
    ? await followeesOf(supabase, filter.followedBy)
    : null;
  if (followees && !followees.length)
    return Object.fromEntries(["All", ...tags].map((tag) => [tag, 0]));
  const counts = await Promise.all(
    [null, ...tags].map(async (tag) => {
      let query = publicTiles(supabase, days, filter, true).select(
        `id, author:profiles!tiles_user_id_profiles_fkey!inner(id)${filter.likedBy ? ", mine:tile_likes!inner(user_id)" : ""}`,
      );
      if (followees) query = query.in("user_id", followees);
      if (filter.likedBy) query = query.eq("mine.user_id", filter.likedBy);
      if (tag) query = query.contains("tags", [tag]);
      if (filter.max)
        query = query.lte("width", filter.max).lte("height", filter.max);
      if (filter.min)
        query = query.or(`width.gte.${filter.min},height.gte.${filter.min}`);
      if (filter.animated) query = query.gt("frame_count", 1);
      const { count, error } = await query;
      if (error)
        throw new Error(`Couldn’t count public arts: ${error.message}`);
      return [tag ?? "All", count ?? 0] as const;
    }),
  );
  return Object.fromEntries(counts);
}

const downloadCounts = (ids: string[]) => totals("tile_downloads", ids);

async function totals(
  table: "tile_downloads" | "tile_views",
  ids: string[],
): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("tile_id, total")
    .in("tile_id", ids);
  if (error) return new Map();
  return new Map(data.map((row) => [row.tile_id, Number(row.total)]));
}

const toPublicTile = (row: PublicTileRow): PublicTile => ({
  ...toProfileTile(row),
  author: {
    id: row.user_id,
    username: row.author.username,
    name: row.author.display_name,
    avatarUrl: avatarUrlOf(row.author),
    ...(row.author.bio !== undefined && { bio: row.author.bio }),
  },
  likes: row.likes[0]?.count ?? 0,
  liked: Boolean(row.mine?.length),
  downloads: 0,
  tags: [],
  description: null,
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
        ? `${ART_PAGE_COLUMNS}, mine:tile_likes(user_id)`
        : ART_PAGE_COLUMNS,
    )
    .eq("id", id)
    .or(
      viewerId
        ? "visibility.eq.public,review.eq.pending"
        : "visibility.eq.public",
    );
  const { data, error } = await (
    viewerId ? query.eq("mine.user_id", viewerId) : query
  ).maybeSingle();
  if (error) throw new Error(`Couldn’t load this art: ${error.message}`);
  if (!data) return null;
  const tile = toPublicTile(data as unknown as PublicTileRow);
  const [downloads, details, remixes, views] = await Promise.all([
    downloadCounts([tile.id]),
    supabase
      .from("tiles")
      .select(
        "tags, description, allow_remix, remix_of_user, original:remix_of_tile(id, name), original_author:remix_of_user(username)",
      )
      .eq("id", tile.id)
      .maybeSingle<{
        tags: string[];
        description: string | null;
        allow_remix: boolean;
        remix_of_user: string | null;
        original: { id: string; name: string } | null;
        original_author: { username: string } | null;
      }>(),
    supabase.rpc("remix_count", { tile: tile.id }),
    supabase
      .from("tile_views")
      .select("total")
      .eq("tile_id", tile.id)
      .maybeSingle<{ total: number }>(),
  ]);
  return {
    ...tile,
    downloads: downloads.get(tile.id) ?? 0,
    remixes: remixes.error ? 0 : Number(remixes.data),
    views: Number(views.data?.total ?? 0),
    tags: details.data?.tags ?? [],
    description: details.data?.description ?? null,
    allowRemix: details.data?.allow_remix ?? true,
    remixOf: details.data?.original_author
      ? {
          username: details.data.original_author.username,
          tile: details.data.original,
        }
      : null,
  };
}

export type AuthorArt = {
  id: string;
  name: string;
  thumbnail: string | null;
};

export async function listMoreByAuthor(
  authorId: string,
  exceptId: string,
  limit = 6,
): Promise<AuthorArt[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tiles")
    .select("id, name, thumbnail")
    .eq("user_id", authorId)
    .eq("visibility", "public")
    .neq("id", exceptId)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Couldn’t load more arts: ${error.message}`);
  return data;
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

export async function hasBlocked(
  viewerId: string | null,
  profileId: string,
): Promise<boolean> {
  if (!viewerId || viewerId === profileId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", viewerId)
    .eq("blocked_id", profileId)
    .maybeSingle();
  return Boolean(data);
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
