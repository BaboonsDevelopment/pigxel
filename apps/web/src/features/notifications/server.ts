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
  ago: string;
  unread: boolean;
} & (
  | {
      kind: "follow";
      name: string;
      username: string;
      avatarUrl: string | null;
    }
  | { kind: "art_rejected"; tileName: string }
  | {
      kind: ActivityKind;
      name: string;
      username: string;
      avatarUrl: string | null;
      tileId: string | null;
      tileName: string;
      detail: string | null;
    }
);

export type ActivityKind = "like" | "comment" | "save" | "remix" | "download";

type NotificationRow = {
  id: string;
  kind: "art_rejected" | ActivityKind;
  tile_id: string | null;
  tile_name: string;
  detail: string | null;
  created_at: string;
  actor: ProfileRow | null;
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
  const [follows, own] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("followee_id", userId)
      .gt("created_at", since),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gt("created_at", since),
  ]);
  return (
    (follows.error ? 0 : (follows.count ?? 0)) +
    (own.error ? 0 : (own.count ?? 0))
  );
}

export async function listNotifications(
  userId: string,
): Promise<AppNotification[]> {
  const supabase = await createClient();
  const [since, { data, error }, own] = await Promise.all([
    seenAt(userId),
    supabase
      .from("follows")
      .select(
        `created_at, follower:profiles!follows_follower_id_fkey(${PROFILE_COLUMNS})`,
      )
      .eq("followee_id", userId)
      .order("created_at", { ascending: false })
      .limit(SHOWN),
    supabase
      .from("notifications")
      .select(
        `id, kind, tile_id, tile_name, detail, created_at, actor:actor_id(${PROFILE_COLUMNS})`,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(SHOWN),
  ]);
  if (error) throw new Error(`Couldn’t load notifications: ${error.message}`);
  const now = Date.now();
  const follows = (
    data as unknown as { created_at: string; follower: ProfileRow | null }[]
  ).flatMap((row) => {
    if (!row.follower) return [];
    const follower = toArtistProfile(row.follower);
    return [
      {
        at: row.created_at,
        item: {
          id: `follow:${follower.id}`,
          kind: "follow" as const,
          name: follower.name,
          username: follower.username,
          avatarUrl: follower.avatarUrl,
          ago: timeAgo(Date.parse(row.created_at), now),
          unread: since !== null && row.created_at > since,
        },
      },
    ];
  });
  const notifications = (
    (own.data ?? []) as unknown as NotificationRow[]
  ).flatMap((row): { at: string; item: AppNotification }[] => {
    const base = {
      id: `notification:${row.id}`,
      ago: timeAgo(Date.parse(row.created_at), now),
      unread: since !== null && row.created_at > since,
    };
    if (row.kind === "art_rejected")
      return [
        {
          at: row.created_at,
          item: { ...base, kind: row.kind, tileName: row.tile_name },
        },
      ];
    if (!row.actor) return [];
    const actor = toArtistProfile(row.actor);
    return [
      {
        at: row.created_at,
        item: {
          ...base,
          kind: row.kind,
          name: actor.name,
          username: actor.username,
          avatarUrl: actor.avatarUrl,
          tileId: row.tile_id,
          tileName: row.tile_name,
          detail: row.detail,
        },
      },
    ];
  });
  return [...follows, ...notifications]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, SHOWN)
    .map((entry) => entry.item);
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
