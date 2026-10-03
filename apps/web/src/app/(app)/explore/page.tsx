import type { Metadata } from "next";
import { PopularFeed } from "@/features/explore/components/popular-feed";
import { getUser } from "@/lib/auth/session";
import { listPublicTiles } from "@/features/profile/server";
import { PAGE_SIZE, PERIODS } from "@/features/explore/constants";

export const metadata: Metadata = { title: "Explore · Pigxel" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ period?: string }> };

export default async function Explore({ searchParams }: Props) {
  const user = await getUser();
  const params = await searchParams;
  const period = PERIODS.find((p) => p.value === params.period) ?? PERIODS[0];
  const { tiles, count } = await listPublicTiles(
    0,
    PAGE_SIZE,
    period.days,
    user?.id ?? null,
  );

  return (
    <PopularFeed
      key={period.value}
      period={period.value}
      initial={tiles}
      count={count}
      guest={!user}
    />
  );
}
