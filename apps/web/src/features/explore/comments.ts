export type ArtComment = {
  id: string;
  body: string;
  createdAt: string;
  edited: boolean;
  parentId: string | null;
  replies: ArtComment[];
  author: {
    id: string;
    username: string | null;
    name: string;
    avatarUrl: string | null;
  };
};

export const COMMENT_MAX = 500;

export const COMMENT_PAGE = 30;

export const COMMENT_COLUMNS =
  "id, body, created_at, edited_at, parent_id, user_id, author:profiles(username, display_name, avatar_kind, avatar_path, provider_avatar_url)";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function commentAge(at: string, now = Date.now()) {
  const elapsed = now - Date.parse(at);
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of UNITS)
    if (elapsed >= size)
      return format.format(-Math.floor(elapsed / size), unit);
  return "just now";
}

export function mapComment(
  list: ArtComment[],
  id: string,
  fn: (comment: ArtComment) => ArtComment,
): ArtComment[] {
  return list.map((comment) =>
    comment.id === id
      ? fn(comment)
      : { ...comment, replies: mapComment(comment.replies, id, fn) },
  );
}

export function removeComment(list: ArtComment[], id: string): ArtComment[] {
  return list
    .filter((comment) => comment.id !== id)
    .map((comment) => ({
      ...comment,
      replies: removeComment(comment.replies, id),
    }));
}
