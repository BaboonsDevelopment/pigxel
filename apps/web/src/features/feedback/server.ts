import "server-only";
import { timeAgo } from "@/features/notifications/server";
import {
  PROFILE_COLUMNS,
  toArtistProfile,
  type ProfileRow,
} from "@/features/profile/profile";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_STATUSES,
  FINISHED_STATUSES,
  titlePattern,
  type FeedbackItem,
  type FeedbackKind,
} from "./feedback";

type FeedbackRow = {
  id: number;
  kind: FeedbackKind;
  title: string;
  description: string;
  status: FeedbackItem["status"];
  votes: number;
  created_at: string;
  author: ProfileRow | null;
  my_vote: { user_id: string }[];
};

export type BoardQuery = {
  kind: FeedbackKind;
  state: "open" | "closed";
  sort: "votes" | "newest";
  search: string;
};

/** Up to `limit` items; throws when the board can't be loaded. */
export async function listFeedback(
  query: BoardQuery,
  limit: number,
): Promise<FeedbackItem[]> {
  const supabase = await createClient();
  let request = supabase
    .from("feedback")
    .select(
      `id, kind, title, description, status, votes, created_at, author:profiles(${PROFILE_COLUMNS}), my_vote:feedback_votes(user_id)`,
    )
    .eq("kind", query.kind)
    .in("status", query.state === "open" ? ACTIVE_STATUSES : FINISHED_STATUSES);
  const pattern = titlePattern(query.search);
  if (pattern) request = request.ilike("title", pattern);
  if (query.sort === "votes")
    request = request.order("votes", { ascending: false });
  const { data, error } = await request
    .order("id", { ascending: false })
    .limit(limit)
    .returns<FeedbackRow[]>();
  if (error) throw new Error(`Couldn’t load feedback: ${error.message}`);
  const now = Date.now();
  return data.map((row) => {
    const author = row.author && toArtistProfile(row.author);
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description,
      status: row.status,
      votes: row.votes,
      createdAt: row.created_at,
      ago: timeAgo(Date.parse(row.created_at), now),
      author: author && { name: author.name, username: author.username },
      voted: row.my_vote.length > 0,
    };
  });
}

/** Null when the counts can't be loaded. */
export async function countFeedback(
  kind: FeedbackKind,
): Promise<{ open: number; closed: number } | null> {
  try {
    const supabase = await createClient();
    const count = async (statuses: string[]) => {
      const { count, error } = await supabase
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("kind", kind)
        .in("status", statuses);
      if (error) throw new Error(error.message);
      return count ?? 0;
    };
    const [open, closed] = await Promise.all([
      count(ACTIVE_STATUSES),
      count(FINISHED_STATUSES),
    ]);
    return { open, closed };
  } catch (error) {
    console.error("Couldn’t count feedback:", error);
    return null;
  }
}

export async function countOwnOpen(
  userId: string,
): Promise<Record<FeedbackKind, number>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("feedback")
      .select("kind")
      .eq("user_id", userId)
      .eq("status", "open")
      .returns<{ kind: FeedbackKind }[]>();
    const rows = data ?? [];
    return {
      bug: rows.filter((r) => r.kind === "bug").length,
      feature: rows.filter((r) => r.kind === "feature").length,
    };
  } catch {
    return { bug: 0, feature: 0 };
  }
}
