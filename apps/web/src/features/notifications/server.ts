import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  PROFILE_COLUMNS,
  toArtistProfile,
  type ProfileRow,
} from "@/features/profile/profile";

export type AppNotification = {
  id: string;
  kind: "follow";
  name: string;
  username: string;
  avatarUrl: string | null;
  ago: string;
  unread: boolean;
};

const SHOWN = 20;

async function seenAt(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("notifications_seen_at")
    .eq("id", userId)
    .maybeSingle<{ notifications_seen_at: string }>();
  return data?.notifications_seen_at ?? null;
}

export async function countUnreadNotifications(
  userId: string,
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const since = await seenAt(userId);
  if (!since) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followee_id", userId)
    .gt("created_at", since);
  return error ? 0 : (count ?? 0);
}

export async function listNotifications(
  userId: string,
): Promise<AppNotification[]> {
  const supabase = await createClient();
  const [since, { data, error }] = await Promise.all([
    seenAt(userId),
    supabase
      .from("follows")
      .select(
        `created_at, follower:profiles!follows_follower_id_fkey(${PROFILE_COLUMNS})`,
      )
      .eq("followee_id", userId)
      .order("created_at", { ascending: false })
      .limit(SHOWN),
  ]);
  if (error) throw new Error(`Couldn’t load notifications: ${error.message}`);
  const now = Date.now();
  return (
    data as unknown as { created_at: string; follower: ProfileRow | null }[]
  ).flatMap((row) => {
    if (!row.follower) return [];
    const follower = toArtistProfile(row.follower);
    return [
      {
        id: `follow:${follower.id}`,
        kind: "follow" as const,
        name: follower.name,
        username: follower.username,
        avatarUrl: follower.avatarUrl,
        ago: timeAgo(Date.parse(row.created_at), now),
        unread: since !== null && row.created_at > since,
      },
    ];
  });
}

export async function markNotificationsSeen(userId: string) {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ notifications_seen_at: new Date().toISOString() })
    .eq("id", userId);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function timeAgo(then: number, now: number) {
  const elapsed = now - then;
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of UNITS)
    if (elapsed >= size)
      return format.format(-Math.floor(elapsed / size), unit);
  return "just now";
}
