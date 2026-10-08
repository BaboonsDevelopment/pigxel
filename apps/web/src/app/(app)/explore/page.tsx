import type { Metadata } from "next";
import { PopularFeed } from "@/features/explore/components/popular-feed";
import { getUser } from "@/lib/auth/session";
import {
  countPublicTilesByTag,
  listPublicTiles,
} from "@/features/profile/server";
import { findArtists } from "@/features/search/server";
import {
  PAGE_SIZE,
  PERIODS,
  QUERY_MAX,
  SIZES,
  SORTS,
  TAGS,
} from "@/features/explore/constants";

export const metadata: Metadata = { title: "Explore · Pigxel" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    period?: string;
    tag?: string;
    size?: string;
    animated?: string;
    q?: string;
    sort?: string;
    feed?: string;
  }>;
};

export default async function Explore({ searchParams }: Props) {
  const user = await getUser();
  const params = await searchParams;
  const period = PERIODS.find((p) => p.value === params.period) ?? PERIODS[0];
  const chosen = params.tag?.split(",") ?? [];
  const tags = TAGS.filter((t) => chosen.includes(t));
  const size = SIZES.find((s) => s.value === params.size) ?? SIZES[0];
  const animated = params.animated === "1";
  const query = (params.q ?? "").trim().slice(0, QUERY_MAX);
  const sort =
    SORTS.find((s) => s.value === params.sort && (user || s.value !== "liked"))
      ?.value ?? SORTS[0].value;
  const feed = user && params.feed === "following" ? "following" : "all";
  const filter = {
    min: size.min,
    max: size.max,
    animated,
    query,
    order: sort === "recent" || sort === "az" ? sort : ("relevance" as const),
    likedBy: sort === "liked" ? user?.id : undefined,
    followedBy: feed === "following" ? user?.id : undefined,
  };
  const [first, tagCounts, artists] = await Promise.all([
    listPublicTiles(
      0,
      PAGE_SIZE,
      period.days,
      user?.id ?? null,
      tags,
      filter,
    ).catch((error: unknown) => {
      console.error(error);
      return null;
    }),
    countPublicTilesByTag(period.days, TAGS, filter).catch((error: unknown) => {
      console.error(error);
      return null;
    }),
    query ? findArtists(query).catch(() => []) : [],
  ]);

  return (
    <PopularFeed
      filters={{
        tags,
        size: size.value,
        animated,
        query,
        sort,
        period: period.value,
        feed,
      }}
      tagCounts={tagCounts}
      artists={artists}
      initial={first?.tiles ?? []}
      count={first?.count ?? 0}
      guest={!user}
      failed={!first}
    />
  );
}
