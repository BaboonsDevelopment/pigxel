import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { Notice } from "@pigxel/ui/components/notice";
import { Page } from "@pigxel/ui/components/page";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { ProfileGallery } from "@/components/profile/profile-gallery";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileStats } from "@/components/profile/profile-stats";
import { requireUser } from "@/lib/auth/session";
import {
  findProfile,
  getFollowStats,
  getProfileActivity,
  listProfileTiles,
} from "@/lib/profile/server";
import { normalizeUsername, usernameError } from "@/lib/profile/validation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

/** The username in the address, lowercase and without "@". */
function usernameIn(segment: string) {
  try {
    return normalizeUsername(decodeURIComponent(segment));
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${usernameIn(username)} · Pigxel` };
}

export default async function ArtistProfilePage({ params }: Props) {
  const username = usernameIn((await params).username);
  if (usernameError(username)) notFound();
  const [user, lookup] = await Promise.all([
    requireUser(),
    findProfile(username),
  ]);
  if (lookup.kind === "missing") notFound();
  if (lookup.kind === "private")
    return (
      <Page className="py-16">
        <EmptyState
          title="This profile is private"
          description={`@${username} keeps their profile and arts to themselves.`}
        />
      </Page>
    );

  const { profile } = lookup;
  const isOwner = profile.id === user.id;
  const [{ tiles, count }, follows, activity] = await Promise.all([
    listProfileTiles(profile.id),
    getFollowStats(profile.id, user.id),
    getProfileActivity(profile.id),
  ]);

  return (
    <Page>
      {isOwner && profile.visibility === "private" && (
        <Notice className="mb-8">
          Your profile is private: only you can see it.{" "}
          <Link href="/settings/privacy" className={textLinkClassName}>
            Change in Privacy settings
          </Link>
        </Notice>
      )}

      <ProfileHeader profile={profile} isOwner={isOwner} follows={follows} />

      <ProfileGallery tiles={tiles} isOwner={isOwner}>
        <ProfileStats
          activity={activity}
          artCount={count}
          publishedCount={
            isOwner
              ? tiles.filter((tile) => tile.visibility === "public").length
              : undefined
          }
        />
      </ProfileGallery>

      {tiles.length === 0 ? (
        <EmptyState
          className="mt-12"
          title={
            isOwner ? "Your arts will show up here" : "No published arts yet"
          }
          description={
            isOwner
              ? "Save a tile to Pigxel cloud, then publish it from this page so others can see it."
              : undefined
          }
          action={
            isOwner && (
              <Link
                href="/tiles/new"
                className={buttonVariants({ size: "lg" })}
              >
                Create tile
              </Link>
            )
          }
        />
      ) : (
        isOwner && (
          <FormMessage className="mt-8 text-xs">
            Only tiles saved to Pigxel cloud appear here. Private arts are
            visible to you alone; publish them to show them on your profile.
          </FormMessage>
        )
      )}
    </Page>
  );
}
