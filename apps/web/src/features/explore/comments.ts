export type ArtComment = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    username: string | null;
    name: string;
    avatarUrl: string | null;
  };
};

export const COMMENT_MAX = 500;

export const COMMENT_COLUMNS =
  "id, body, created_at, user_id, author:profiles(username, display_name, avatar_kind, avatar_path, provider_avatar_url)";

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
