import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toSummary, type CloudTileSummary } from "@/lib/pigxel-file/cloud";
import {
  PROFILE_COLUMNS,
  toArtistProfile,
  type ProfileRow,
} from "@/features/profile/profile";
import { USERNAME_MAX, normalizeUsername } from "@/features/profile/validation";

export type ArtistResult = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

export type SearchResults = {
  tiles: CloudTileSummary[];
  artists: ArtistResult[];
};

const LIMIT = 6;
const MAX_QUERY = 50;

type Supabase = Awaited<ReturnType<typeof createClient>>;

const literal = (query: string) => query.replace(/[\\%_]/g, "\\$&");

const isHandleQuery = (query: string) => query.trim().startsWith("@");

function toResult(row: ProfileRow): ArtistResult {
  const profile = toArtistProfile(row);
  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  };
}

async function byHandle(
  supabase: Supabase,
  handle: string,
): Promise<ArtistResult[]> {
  if (!/^[a-z0-9_]+$/.test(handle) || handle.length > USERNAME_MAX) return [];
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .ilike("username", `${literal(handle)}%`)
    .order("username")
    .limit(LIMIT * 3);
  return ((data ?? []) as ProfileRow[])
    .map(toResult)
    .sort((a, b) => a.username.length - b.username.length)
    .slice(0, LIMIT);
}

async function byText(
  supabase: Supabase,
  text: string,
): Promise<ArtistResult[]> {
  const pattern = `%${literal(text)}%`;
  const [byUsername, byName] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .ilike("username", pattern)
      .limit(LIMIT),
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .ilike("display_name", pattern)
      .limit(LIMIT),
  ]);

  const artists = new Map<string, ArtistResult>();
  for (const row of [
    ...((byUsername.data ?? []) as ProfileRow[]),
    ...((byName.data ?? []) as ProfileRow[]),
  ])
    artists.set(row.id, toResult(row));
  const exact = text.toLowerCase();
  return [...artists.values()]
    .sort((a, b) => Number(b.username === exact) - Number(a.username === exact))
    .slice(0, LIMIT);
}

export async function findArtists(query: string): Promise<ArtistResult[]> {
  const supabase = await createClient();
  if (isHandleQuery(query)) {
    const handle = normalizeUsername(query).slice(0, MAX_QUERY);
    return handle ? byHandle(supabase, handle) : [];
  }
  const text = query.trim().slice(0, MAX_QUERY);
  return text ? byText(supabase, text) : [];
}

export async function search(
  userId: string,
  query: string,
): Promise<SearchResults> {
  const text = query.trim().slice(0, MAX_QUERY);
  if (!text || isHandleQuery(query))
    return { tiles: [], artists: await findArtists(query) };
  const supabase = await createClient();
  const [tiles, artists] = await Promise.all([
    supabase
      .from("tiles")
      .select("id, user_id, name, width, height, thumbnail, updated_at")
      .eq("user_id", userId)
      .ilike("name", `%${literal(text)}%`)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    byText(supabase, text),
  ]);
  return { tiles: (tiles.data ?? []).map(toSummary), artists };
}
