import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { avatarUrlOf, type ProfileRow } from "@/features/profile/profile";
import { COMMENT_COLUMNS, COMMENT_PAGE, type ArtComment } from "./comments";

export type SavedArt = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnail: string | null;
  author: string;
  savedAt: string;
};

type SavedRow = {
  created_at: string;
  tile: {
    id: string;
    name: string;
    width: number;
    height: number;
    thumbnail: string | null;
    author: { username: string };
  };
};

export async function isTileSaved(
  userId: string,
  tileId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_tiles")
    .select("tile_id")
    .eq("user_id", userId)
    .eq("tile_id", tileId)
    .maybeSingle();
  return !error && !!data;
}

export async function listSavedArts(userId: string): Promise<SavedArt[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_tiles")
    .select(
      "created_at, tile:tiles!inner(id, name, width, height, thumbnail, author:profiles!tiles_user_id_profiles_fkey!inner(username))",
    )
    .eq("user_id", userId)
    .eq("tile.visibility", "public")
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw new Error(`Couldn’t load saved arts: ${error.message}`);
  return (data as unknown as SavedRow[]).map((row) => ({
    id: row.tile.id,
    name: row.tile.name,
    width: row.tile.width,
    height: row.tile.height,
    thumbnail: row.tile.thumbnail,
    author: row.tile.author.username,
    savedAt: row.created_at,
  }));
}

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  parent_id: string | null;
  user_id: string;
  author: Pick<
    ProfileRow,
    | "username"
    | "display_name"
    | "avatar_kind"
    | "avatar_path"
    | "provider_avatar_url"
  > | null;
};

export function toComment(row: CommentRow): ArtComment {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    edited: row.edited_at !== null,
    parentId: row.parent_id,
    replies: [],
    author: {
      id: row.user_id,
      username: row.author?.username ?? null,
      name: row.author?.display_name ?? "Someone",
      avatarUrl: row.author ? avatarUrlOf(row.author) : null,
    },
  };
}

export async function listComments(
  tileId: string,
  before?: string,
): Promise<{ comments: ArtComment[]; count: number }> {
  const supabase = await createClient();
  const query = supabase
    .from("tile_comments")
    .select(COMMENT_COLUMNS, { count: "exact" })
    .eq("tile_id", tileId)
    .is("parent_id", null);
  const { data, count, error } = await (
    before ? query.lt("created_at", before) : query
  )
    .order("created_at", { ascending: false })
    .limit(COMMENT_PAGE);
  if (error) throw new Error(`Couldn’t load comments: ${error.message}`);
  const rows = data as unknown as CommentRow[];
  const comments = rows.map(toComment);
  if (comments.length) {
    const replies = await supabase
      .from("tile_comments")
      .select(COMMENT_COLUMNS)
      .in(
        "parent_id",
        comments.map((c) => c.id),
      )
      .order("created_at", { ascending: true });
    if (replies.error)
      throw new Error(`Couldn’t load replies: ${replies.error.message}`);
    const byId = new Map(comments.map((c) => [c.id, c]));
    for (const row of replies.data as unknown as CommentRow[]) {
      const reply = toComment(row);
      byId.set(reply.id, reply);
      byId.get(row.parent_id!)?.replies.push(reply);
    }
  }
  return { comments, count: count ?? rows.length };
}
