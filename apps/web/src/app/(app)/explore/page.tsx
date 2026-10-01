import type { Metadata } from "next";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { PopularFeed } from "@/components/explore/popular-feed";
import { getUser } from "@/lib/auth/session";
import { listPublicTiles } from "@/lib/profile/server";
import { PAGE_SIZE, PERIODS } from "./constants";
import { PeriodTabs } from "./period-tabs";

export const metadata: Metadata = { title: "Explore · Pigxel" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ period?: string }> };

/** Everyone's arts published in the period chosen, most liked first; more load on scroll. */
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
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="font-display text-4xl tracking-tight">Popular tiles</h1>
        <PeriodTabs active={period.value} />
      </div>
      <div className="pt-5">
        {tiles.length ? (
          <PopularFeed
            key={period.value}
            period={period.value}
            initial={tiles}
            count={count}
            guest={!user}
          />
        ) : (
          <EmptyState
            title="No arts here yet"
            description="Published arts from everyone will show up here."
          />
        )}
      </div>
    </>
  );
}
