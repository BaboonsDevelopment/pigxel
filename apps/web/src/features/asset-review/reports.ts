import "server-only";
import { removeTiles } from "@/features/tiles/remove-tiles";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewError } from "./server";
import type {
  ArtAction,
  CommentAction,
  ReportAuthor,
  ReportedArt,
  ReportedComment,
  Reports,
} from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REPORTS = 2000;
const ART_ACTIONS: ArtAction[] = ["keep", "unpublish", "delete", "ban"];
const COMMENT_ACTIONS: CommentAction[] = ["keep", "delete"];

type Admin = ReturnType<typeof createAdminClient>;

function check<T>(result: {
  data: T | null;
  error: { message: string } | null;
}) {
  if (result.error) throw new Error(result.error.message);
  return result.data!;
}

async function authorsOf(admin: Admin, ids: string[]) {
  const unique = [...new Set(ids)];
  const [profiles, bans] = await Promise.all([
    admin.from("profiles").select("id, username").in("id", unique),
    admin.from("bans").select("user_id").in("user_id", unique),
  ]);
  const names = new Map(
    check(profiles).map((p: { id: string; username: string | null }) => [
      p.id,
      p.username,
    ]),
  );
  const banned = new Set(
    check(bans).map((b: { user_id: string }) => b.user_id),
  );
  return (id: string): ReportAuthor => ({
    id,
    username: names.get(id) ?? null,
    banned: banned.has(id),
  });
}

type Tally = {
  reports: number;
  reasons: Record<string, number>;
  details: string[];
  lastAt: string;
};

function tally<R extends { created_at: string }>(
  rows: R[],
  key: (row: R) => string,
  add?: (entry: Tally, row: R) => void,
) {
  const map = new Map<string, Tally>();
  for (const row of rows) {
    const entry = map.get(key(row)) ?? {
      reports: 0,
      reasons: {},
      details: [],
      lastAt: row.created_at,
    };
    entry.reports++;
    add?.(entry, row);
    map.set(key(row), entry);
  }
  return map;
}

const byReports = (
  a: { reports: number; lastAt: string },
  b: { reports: number; lastAt: string },
) => b.reports - a.reports || b.lastAt.localeCompare(a.lastAt);

async function reportedArts(admin: Admin): Promise<ReportedArt[]> {
  const rows = check(
    await admin
      .from("art_reports")
      .select("tile_id, reason, details, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_REPORTS)
      .returns<
        {
          tile_id: string;
          reason: string;
          details: string | null;
          created_at: string;
        }[]
      >(),
  );
  const counts = tally(
    rows,
    (row) => row.tile_id,
    (entry, row) => {
      entry.reasons[row.reason] = (entry.reasons[row.reason] ?? 0) + 1;
      if (row.details) entry.details.push(row.details);
    },
  );
  if (!counts.size) return [];
  const tiles = check(
    await admin
      .from("tiles")
      .select("id, name, thumbnail, visibility, user_id")
      .in("id", [...counts.keys()])
      .returns<
        {
          id: string;
          name: string;
          thumbnail: string | null;
          visibility: string;
          user_id: string;
        }[]
      >(),
  );
  const author = await authorsOf(
    admin,
    tiles.map((t) => t.user_id),
  );
  return tiles
    .map((tile) => ({
      id: tile.id,
      name: tile.name,
      thumbnail: tile.thumbnail,
      visibility: tile.visibility,
      author: author(tile.user_id),
      ...counts.get(tile.id)!,
    }))
    .sort(byReports);
}

async function reportedComments(admin: Admin): Promise<ReportedComment[]> {
  const rows = check(
    await admin
      .from("comment_reports")
      .select("comment_id, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_REPORTS)
      .returns<{ comment_id: string; created_at: string }[]>(),
  );
  const counts = tally(rows, (row) => row.comment_id);
  if (!counts.size) return [];
  const comments = check(
    await admin
      .from("tile_comments")
      .select("id, body, tile_id, user_id, tile:tiles(name)")
      .in("id", [...counts.keys()])
      .returns<
        {
          id: string;
          body: string;
          tile_id: string;
          user_id: string;
          tile: { name: string } | null;
        }[]
      >(),
  );
  const author = await authorsOf(
    admin,
    comments.map((c) => c.user_id),
  );
  return comments
    .map((comment) => {
      const { reports, lastAt } = counts.get(comment.id)!;
      return {
        id: comment.id,
        body: comment.body,
        tileId: comment.tile_id,
        tileName: comment.tile?.name ?? null,
        author: author(comment.user_id),
        reports,
        lastAt,
      };
    })
    .sort(byReports);
}

export async function listReports(): Promise<Reports> {
  const admin = createAdminClient();
  const [arts, comments] = await Promise.all([
    reportedArts(admin),
    reportedComments(admin),
  ]);
  return { arts, comments };
}

async function banUser(admin: Admin, userId: string) {
  check(await admin.from("bans").upsert({ user_id: userId }));
  const tiles = check(
    await admin
      .from("tiles")
      .select("id")
      .eq("user_id", userId)
      .returns<{ id: string }[]>(),
  );
  check(
    await admin
      .from("tiles")
      .update({
        visibility: "private",
        review: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("visibility", "public"),
  );
  check(await admin.from("tile_comments").delete().eq("user_id", userId));
  if (tiles.length)
    check(
      await admin
        .from("art_reports")
        .delete()
        .in(
          "tile_id",
          tiles.map((t) => t.id),
        ),
    );
}

export async function resolveArt(id: string, action: unknown) {
  if (!UUID.test(id)) throw new ReviewError("No such art.", 404);
  if (!ART_ACTIONS.includes(action as ArtAction))
    throw new ReviewError("Unknown action.");
  const admin = createAdminClient();
  const tile = check(
    await admin
      .from("tiles")
      .select("id, user_id, name")
      .eq("id", id)
      .maybeSingle<{ id: string; user_id: string; name: string }>(),
  );
  if (!tile) throw new ReviewError("No such art.", 404);

  if (action === "delete") {
    const failure = await removeTiles(admin, [tile]);
    if (failure) throw new Error(failure);
    return;
  }
  if (action === "ban") return banUser(admin, tile.user_id);
  if (action === "unpublish") {
    check(await admin.from("tile_takedowns").upsert({ tile_id: tile.id }));
    check(
      await admin
        .from("tiles")
        .update({
          visibility: "private",
          review: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", tile.id),
    );
    const notified = await admin.from("notifications").insert({
      user_id: tile.user_id,
      kind: "art_rejected",
      tile_id: tile.id,
      tile_name: tile.name,
    });
    if (notified.error)
      console.error(
        `Couldn’t notify about ${tile.id}:`,
        notified.error.message,
      );
  }
  check(await admin.from("art_reports").delete().eq("tile_id", tile.id));
}

export async function resolveComment(id: string, action: unknown) {
  if (!UUID.test(id)) throw new ReviewError("No such comment.", 404);
  if (!COMMENT_ACTIONS.includes(action as CommentAction))
    throw new ReviewError("Unknown action.");
  const admin = createAdminClient();
  const removed = check(
    action === "delete"
      ? await admin.from("tile_comments").delete().eq("id", id).select("id")
      : await admin
          .from("comment_reports")
          .delete()
          .eq("comment_id", id)
          .select("id"),
  );
  if (!removed.length) throw new ReviewError("No such comment.", 404);
}
