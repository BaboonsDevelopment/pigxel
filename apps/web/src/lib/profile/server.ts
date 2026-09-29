import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { profileOf, type Profile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  PROFILE_COLUMNS,
  toArtistProfile,
  type ArtistProfile,
  type ProfileRow,
  type ProfileTile,
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

/** The signed-in person's own profile; null until the profiles table exists. */
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

/** What the sidebar shows: the profile, or the sign-in details before it exists. */
export async function sidebarProfile(user: User): Promise<Profile> {
  const own = await getOwnProfile(user.id);
  const fallback = profileOf(user);
  return own
    ? {
        ...fallback,
        name: own.name,
        avatarUrl: own.avatarUrl,
        username: own.username,
      }
    : fallback;
}

export type ProfileLookup =
  | { kind: "found"; profile: ArtistProfile }
  | { kind: "private" }
  | { kind: "missing" };

/**
 * The profile at /u/<username>, as far as the signed-in person may see it.
 * A failed lookup throws, so it shows as an error instead of "not found".
 */
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

/**
 * A person's cloud tiles, pinned first, and how many there are. Row-level
 * security leaves visitors only the public ones, so both fit the viewer.
 */
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
  if (error || !data) return { tiles: [], count: 0 };
  return {
    count: count ?? data.length,
    tiles: (data as TileRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      width: row.width,
      height: row.height,
      thumbnail: row.thumbnail,
      visibility: row.visibility,
      pinOrder: row.pin_order,
      updatedAt: row.updated_at,
    })),
  };
}
