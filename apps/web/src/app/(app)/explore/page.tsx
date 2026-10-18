import type { Metadata } from "next";
import { PopularFeed } from "@/features/explore/components/popular-feed";
import { getUser } from "@/lib/auth/session";
import {
  countPublicTilesByTag,
  listPublicTiles,
} from "@/features/profile/server";
import { findArtists } from "@/features/search/server";
import { PAGE_SIZE } from "@/features/explore/constants";
import {
  artQuery,
  parseExploreParams,
  type ExploreParams,
} from "@/features/explore/filters";

export const metadata: Metadata = { title: "Explore · Pigxel" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<ExploreParams> };

export default async function Explore({ searchParams }: Props) {
  const user = await getUser();
  const filters = parseExploreParams(await searchParams, !!user);
  const { days, filter } = artQuery(filters, user?.id ?? null);
  const [first, tagCounts, artists] = await Promise.all([
    listPublicTiles(
      0,
      PAGE_SIZE,
      days,
      user?.id ?? null,
      filters.tags,
      filter,
    ).catch((error: unknown) => {
      console.error(error);
      return null;
    }),
    countPublicTilesByTag(days, filter).catch((error: unknown) => {
      console.error(error);
      return null;
    }),
    filters.query ? findArtists(filters.query).catch(() => []) : [],
  ]);

  return (
    <PopularFeed
      filters={filters}
      tagCounts={tagCounts}
      artists={artists}
      initial={first?.tiles ?? []}
      count={first?.count ?? 0}
      guest={!user}
      failed={!first}
    />
  );
}
