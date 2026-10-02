import "server-only";
import { timeAgo } from "@/lib/notifications/server";
import {
  PROFILE_COLUMNS,
  toArtistProfile,
  type ProfileRow,
} from "@/lib/profile/profile";
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
  /** The viewer's own vote, if any: they can only see their own. */
  my_vote: { user_id: string }[];
};

export type BoardQuery = {
  kind: FeedbackKind;
  state: "open" | "closed";
  sort: "votes" | "newest";
  search: string;
};

const SHOWN = 50;

/** One page of the board: a kind, open or closed, sorted, maybe searched. */
export async function listFeedback(query: BoardQuery): Promise<FeedbackItem[]> {
  try {
    const supabase = await createClient();
    let request = supabase
      .from("feedback")
      .select(
        `id, kind, title, description, status, votes, created_at, author:profiles(${PROFILE_COLUMNS}), my_vote:feedback_votes(user_id)`,
      )
      .eq("kind", query.kind)
      .in(
        "status",
        query.state === "open" ? ACTIVE_STATUSES : FINISHED_STATUSES,
      );
    const pattern = titlePattern(query.search);
    if (pattern) request = request.ilike("title", pattern);
    if (query.sort === "votes")
      request = request.order("votes", { ascending: false });
    const { data, error } = await request
      .order("id", { ascending: false })
      .limit(SHOWN)
      .returns<FeedbackRow[]>();
    if (error || !data) return [];
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
  } catch {
    return [];
  }
}

/** How many reports of a kind are open and closed, for the tabs. */
export async function countFeedback(
  kind: FeedbackKind,
): Promise<{ open: number; closed: number }> {
  try {
    const supabase = await createClient();
    const count = async (statuses: string[]) => {
      const { count } = await supabase
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("kind", kind)
        .in("status", statuses);
      return count ?? 0;
    };
    const [open, closed] = await Promise.all([
      count(ACTIVE_STATUSES),
      count(FINISHED_STATUSES),
    ]);
    return { open, closed };
  } catch {
    return { open: 0, closed: 0 };
  }
}

/** How many of the person's reports of each kind still wait for the team. */
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
