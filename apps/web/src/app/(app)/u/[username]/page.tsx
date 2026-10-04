import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { Notice } from "@pigxel/ui/components/notice";
import { Page } from "@pigxel/ui/components/page";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { ProfileGallery } from "@/features/profile/components/profile-gallery";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { ProfileStats } from "@/features/profile/components/profile-stats";
import { getUser } from "@/lib/auth/session";
import {
  findProfile,
  getFollowStats,
  getProfileActivity,
  listProfileTiles,
} from "@/features/profile/server";
import { usernameError, usernameIn } from "@/features/profile/validation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${usernameIn(username)} · Pigxel` };
}

export default async function ArtistProfilePage({ params }: Props) {
  const username = usernameIn((await params).username);
  if (usernameError(username)) notFound();
  const [user, lookup] = await Promise.all([getUser(), findProfile(username)]);
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
  const isOwner = profile.id === user?.id;
  const [arts, follows, activity] = await Promise.all([
    listProfileTiles(profile.id).catch((error: unknown) => {
      console.error(error);
      return null;
    }),
    getFollowStats(profile.id, user?.id ?? null),
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

      <ProfileHeader
        profile={profile}
        isOwner={isOwner}
        guest={!user}
        follows={follows}
      />

      {!arts ? (
        <Notice tone="error" className="mt-8">
          Couldn’t load {isOwner ? "your" : "these"} arts. Refresh the page to
          try again.
        </Notice>
      ) : (
        <>
          <ProfileGallery tiles={arts.tiles} isOwner={isOwner}>
            <ProfileStats
              activity={activity}
              artCount={arts.count}
              publishedCount={
                isOwner
                  ? arts.tiles.filter((tile) => tile.visibility === "public")
                      .length
                  : undefined
              }
            />
          </ProfileGallery>

          {arts.tiles.length === 0 ? (
            <EmptyState
              className="mt-12"
              title={
                isOwner
                  ? "Your arts will show up here"
                  : "No published arts yet"
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
        </>
      )}
    </Page>
  );
}
