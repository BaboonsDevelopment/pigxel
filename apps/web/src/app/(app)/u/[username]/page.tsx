import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { Notice } from "@pigxel/ui/components/notice";
import { Page } from "@pigxel/ui/components/page";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { PeopleGrid } from "@/features/profile/components/people-grid";
import { ProfileArts } from "@/features/profile/components/profile-arts/profile-arts";
import { ProfileHero } from "@/features/profile/components/profile-hero/profile-hero";
import { ProfileSectionHeader } from "@/features/profile/components/profile-section-header";
import { ProfileTabs } from "@/features/profile/components/profile-tabs";
import { CollectionList } from "@/features/collections/components/collection-list";
import { listProfileCollections } from "@/features/collections/server";
import { getUser } from "@/lib/auth/session";
import {
  findProfile,
  getFollowStats,
  getProfileActivity,
  hasBlocked,
  listFollows,
  listProfileArts,
  listProfileTags,
} from "@/features/profile/server";
import {
  NO_ARTS_QUERY,
  readArtsQuery,
  type ArtistProfile,
  type ProfileTile,
} from "@/features/profile/profile";
import { ArtsToolbar } from "@/features/profile/components/arts-toolbar";
import { ActivityHeatmap } from "@/features/profile/components/activity-heatmap";
import { readTab, tabHref, type ProfileTabId } from "@/features/profile/tabs";
import { usernameError, usernameIn } from "@/features/profile/validation";

export const dynamic = "force-dynamic";

const PROFILE_PAGE = "max-w-[100rem] px-5 pt-3 pb-12 md:px-8 md:pt-2 xl:px-10";

type Props = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ tab?: string; sort?: string; tag?: string }>;
};

type TabContent =
  | { kind: "arts"; tiles: ProfileTile[]; count: number }
  | { kind: "people"; people: ArtistProfile[]; count: number }
  | { kind: "collections" };

const EMPTY: Record<ProfileTabId, { own: string; other: string }> = {
  published: {
    own: "Publish an art to Explore and it shows up here.",
    other: "No published arts yet.",
  },
  drafts: {
    own: "Arts saved to Pigxel cloud but not published show up here.",
    other: "",
  },
  liked: {
    own: "Arts you like on Explore show up here.",
    other: "No liked arts yet.",
  },
  saved: { own: "Arts you save on Explore show up here.", other: "" },
  followed: {
    own: "Artists you follow show up here.",
    other: "Not following anyone yet.",
  },
  followers: {
    own: "People who follow you show up here.",
    other: "No followers yet.",
  },
  collections: { own: "", other: "" },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const username = usernameIn((await params).username);
  const lookup = usernameError(username)
    ? null
    : await findProfile(username).catch(() => null);
  if (lookup?.kind !== "found") return { title: `@${username} · Pigxel` };
  const { profile } = lookup;
  const title = `${profile.name} (@${profile.username}) · Pigxel`;
  const description =
    profile.bio.trim().replace(/\s+/g, " ").slice(0, 200) ||
    `Pixel art by ${profile.name} on Pigxel.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile", siteName: "Pigxel" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ArtistProfilePage({
  params,
  searchParams,
}: Props) {
  const username = usernameIn((await params).username);
  if (usernameError(username)) notFound();
  const [user, lookup, search] = await Promise.all([
    getUser(),
    findProfile(username),
    searchParams ??
      Promise.resolve({} as { tab?: string; sort?: string; tag?: string }),
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
  const isOwner = profile.id === user?.id;
  const tab = readTab(search.tab, isOwner);
  const query =
    tab.id === "published"
      ? readArtsQuery(search.sort, search.tag)
      : NO_ARTS_QUERY;

  const loadTab = async (): Promise<TabContent> => {
    if (
      tab.id === "published" ||
      tab.id === "drafts" ||
      tab.id === "liked" ||
      tab.id === "saved"
    )
      return {
        kind: "arts",
        ...(await listProfileArts(profile.id, tab.id, 0, query)),
      };
    if (tab.id === "followed" || tab.id === "followers")
      return { kind: "people", ...(await listFollows(profile.id, tab.id)) };
    return { kind: "collections" };
  };

  const showActivity = isOwner || profile.showActivity;
  const [follows, blocked, collections, content, tags, activity] =
    await Promise.all([
      getFollowStats(profile.id, user?.id ?? null),
      hasBlocked(user?.id ?? null, profile.id),
      listProfileCollections(profile.id).catch((error: unknown) => {
        console.error(error);
        return [];
      }),
      loadTab().catch((error: unknown) => {
        console.error(error);
        return null;
      }),
      tab.id === "published" ? listProfileTags(profile.id) : [],
      showActivity ? getProfileActivity(profile.id) : null,
    ]);

  const count =
    content?.kind === "collections"
      ? collections.length
      : (content?.count ?? 0);
  const empty =
    content !== null &&
    (content.kind === "arts"
      ? content.tiles.length === 0
      : content.kind === "people"
        ? content.people.length === 0
        : collections.length === 0);

  return (
    <Page className={PROFILE_PAGE}>
      {isOwner && profile.visibility === "private" && (
        <Notice className="mb-6">
          Your profile is private: only you can see it.{" "}
          <Link href="/settings/privacy" className={textLinkClassName}>
            Change in Privacy settings
          </Link>
        </Notice>
      )}

      {blocked && (
        <Notice className="mb-6">
          You blocked @{profile.username}. You won’t see each other’s arts or
          comments. Unblock them from the ⋯ menu.
        </Notice>
      )}

      <ProfileHero
        profile={profile}
        isOwner={isOwner}
        guest={!user}
        follows={follows}
        blocked={blocked}
        tabHref={(id) => tabHref(profile.username, id)}
      />

      {activity && <ActivityHeatmap activity={activity} />}

      <ProfileTabs
        profileId={profile.id}
        username={profile.username}
        active={tab.id}
        isOwner={isOwner}
        withCollections={collections.length > 0}
      />

      <section aria-labelledby="profile-section" className="mt-8">
        <ProfileSectionHeader
          id="profile-section"
          title={tab.title}
          count={count}
          action={
            tab.id === "published" &&
            (count > 0 || query.tag || query.sort !== "newest") && (
              <ArtsToolbar
                username={profile.username}
                query={query}
                tags={tags}
              />
            )
          }
        />
        {content === null ? (
          <Notice tone="error">
            Couldn’t load {isOwner ? "your" : "these"}{" "}
            {tab.id === "followed" || tab.id === "followers"
              ? "artists"
              : "arts"}
            . Refresh the page to try again.
          </Notice>
        ) : empty ? (
          <EmptyState
            title="Nothing here yet"
            description={EMPTY[tab.id][isOwner ? "own" : "other"]}
            action={
              isOwner &&
              tab.id === "published" && (
                <Link href="/tiles/new" className={buttonVariants({})}>
                  Create tile
                </Link>
              )
            }
          />
        ) : content.kind === "arts" ? (
          <ProfileArts
            key={`${tab.id}:${query.sort}:${query.tag ?? ""}`}
            query={query}
            profileId={profile.id}
            tiles={content.tiles}
            count={content.count}
            kind={
              tab.id === "drafts" || tab.id === "liked" || tab.id === "saved"
                ? tab.id
                : "published"
            }
            isOwner={isOwner}
            viewerId={user?.id ?? null}
          />
        ) : content.kind === "people" ? (
          <PeopleGrid people={content.people} />
        ) : (
          <CollectionList collections={collections} />
        )}
      </section>
    </Page>
  );
}
