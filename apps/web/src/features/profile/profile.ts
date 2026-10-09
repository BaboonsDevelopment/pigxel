import { readLinks, type ProfileLink } from "./validation";

export type Visibility = "public" | "private";
export type AvatarKind = "none" | "provider" | "upload";

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  links: unknown;
  avatar_kind: AvatarKind;
  provider_avatar_url: string | null;
  avatar_path: string | null;
  visibility: Visibility;
  created_at: string;
  premium_since: string | null;
  location?: string;
  cover_path?: string | null;
  show_activity?: boolean;
};

export const PROFILE_COLUMNS =
  "id, username, display_name, bio, links, avatar_kind, provider_avatar_url, avatar_path, visibility, created_at, premium_since";

export const PROFILE_PAGE_COLUMNS = `${PROFILE_COLUMNS}, location, cover_path, show_activity`;

export type ArtistProfile = {
  id: string;
  username: string;
  name: string;
  bio: string;
  location: string;
  coverUrl: string | null;
  showActivity: boolean;
  links: ProfileLink[];
  avatarKind: AvatarKind;
  avatarUrl: string | null;
  providerAvatarUrl: string | null;
  visibility: Visibility;
  joinedAt: string;
  premiumSince: string | null;
};

export const MAX_PINS = 4;

export const ARTS_PAGE = 40;

export type ArtsKind = "published" | "drafts" | "liked" | "saved";

export const ART_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "likes", label: "Most liked" },
  { value: "downloads", label: "Most downloaded" },
] as const;

export type ArtSort = (typeof ART_SORTS)[number]["value"];

export type ArtsQuery = { sort: ArtSort; tag: string | null };

export const NO_ARTS_QUERY: ArtsQuery = { sort: "newest", tag: null };

const TAG = /^[\p{L}\p{N} _-]{1,40}$/u;

export function readArtsQuery(sort?: string, tag?: string): ArtsQuery {
  return {
    sort: ART_SORTS.find((s) => s.value === sort)?.value ?? "newest",
    tag: tag && TAG.test(tag) ? tag : null,
  };
}

export type ProfileTile = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnail: string | null;
  visibility: Visibility;
  inReview?: boolean;
  pinOrder: number | null;
  updatedAt: string;
  likes?: number;
  views?: number;
};

export type TileAuthor = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio?: string;
};

export type PublicTile = ProfileTile & {
  author: TileAuthor;
  likes: number;
  liked: boolean;
  downloads: number;
  tags: string[];
  description: string | null;
  allowRemix?: boolean;
  remixes?: number;
  views?: number;
  remixOf?: {
    username: string;
    tile: { id: string; name: string } | null;
  } | null;
};

export const AVATAR_BUCKET = "avatars";

function uploadedAvatarUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

export function avatarUrlOf(
  row: Pick<ProfileRow, "avatar_kind" | "avatar_path" | "provider_avatar_url">,
) {
  return row.avatar_kind === "upload" && row.avatar_path
    ? uploadedAvatarUrl(row.avatar_path)
    : row.avatar_kind === "provider"
      ? row.provider_avatar_url
      : null;
}

export function toArtistProfile(row: ProfileRow): ArtistProfile {
  const avatarUrl = avatarUrlOf(row);
  return {
    id: row.id,
    username: row.username,
    name: row.display_name,
    bio: row.bio,
    location: row.location ?? "",
    coverUrl: row.cover_path ? uploadedAvatarUrl(row.cover_path) : null,
    showActivity: row.show_activity ?? true,
    links: readLinks(row.links),
    avatarKind: row.avatar_kind,
    avatarUrl,
    providerAvatarUrl: row.provider_avatar_url,
    visibility: row.visibility,
    joinedAt: row.created_at,
    premiumSince: row.premium_since,
  };
}

export function monthLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function joinedLabel(iso: string) {
  const month = monthLabel(iso);
  return month && `Joined ${month}`;
}
