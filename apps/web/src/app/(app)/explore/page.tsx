import type { Metadata } from "next";
import { PopularFeed } from "@/features/explore/components/popular-feed";
import { getUser } from "@/lib/auth/session";
import {
  countPublicTilesByTag,
  listPublicTiles,
} from "@/features/profile/server";
import { PAGE_SIZE, PERIODS, SIZES, TAGS } from "@/features/explore/constants";

export const metadata: Metadata = { title: "Explore · Pigxel" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    period?: string;
    tag?: string;
    size?: string;
    animated?: string;
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
  const [first, tagCounts] = await Promise.all([
    listPublicTiles(0, PAGE_SIZE, period.days, user?.id ?? null, tags, {
      ...size,
      animated,
    }).catch((error: unknown) => {
      console.error(error);
      return null;
    }),
    countPublicTilesByTag(period.days, TAGS, { ...size, animated }).catch(
      (error: unknown) => {
        console.error(error);
        return null;
      },
    ),
  ]);

  return (
    <PopularFeed
      key={`${period.value}:${tags.join(",") || "all"}:${size.value}:${animated}`}
      period={period.value}
      tags={tags}
      size={size.value}
      animated={animated}
      tagCounts={tagCounts}
      initial={first?.tiles ?? []}
      count={first?.count ?? 0}
      guest={!user}
      failed={!first}
    />
  );
}
