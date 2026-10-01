import { readLinks, type ProfileLink } from "./validation";

export type Visibility = "public" | "private";
export type AvatarKind = "none" | "provider" | "upload";

/** A row of the `profiles` table. */
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
};

export const PROFILE_COLUMNS =
  "id, username, display_name, bio, links, avatar_kind, provider_avatar_url, avatar_path, visibility, created_at, premium_since";

/** An artist's profile as the pages show it. */
export type ArtistProfile = {
  id: string;
  username: string;
  name: string;
  bio: string;
  links: ProfileLink[];
  avatarKind: AvatarKind;
  /** The picture to show; null shows the initial instead. */
  avatarUrl: string | null;
  /** The sign-in provider's picture, offered as an avatar choice. */
  providerAvatarUrl: string | null;
  visibility: Visibility;
  joinedAt: string;
  /** When they became premium; null on Free. */
  premiumSince: string | null;
};

/** Pinned arts at the top of a profile; the database checks it too. */
export const MAX_PINS = 4;

/** A cloud tile as a profile shows it. */
export type ProfileTile = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnail: string | null;
  visibility: Visibility;
  /** 1–6 when pinned to the top of the profile. */
  pinOrder: number | null;
  updatedAt: string;
};

/** Who made a published art, as a card shows them. */
export type TileAuthor = {
  username: string;
  name: string;
  avatarUrl: string | null;
};

/** A published art with its author, its likes and whether the viewer liked it. */
export type PublicTile = ProfileTile & {
  author: TileAuthor;
  likes: number;
  liked: boolean;
};

export const AVATAR_BUCKET = "avatars";

/** The public address of an uploaded avatar. */
function uploadedAvatarUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

/** The picture a profile shows; null shows the initial instead. */
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
    links: readLinks(row.links),
    avatarKind: row.avatar_kind,
    avatarUrl,
    providerAvatarUrl: row.provider_avatar_url,
    visibility: row.visibility,
    joinedAt: row.created_at,
    premiumSince: row.premium_since,
  };
}

/** "September 2026", or null for a date that doesn't parse. */
export function monthLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Joined September 2026". */
export function joinedLabel(iso: string) {
  const month = monthLabel(iso);
  return month && `Joined ${month}`;
}
