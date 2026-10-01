import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { Pager } from "@/components/pager/pager";
import { ArtCard } from "@/components/profile/art-card";
import { requireUser } from "@/lib/auth/session";
import { listPublicTiles } from "@/lib/profile/server";
import { PERIODS } from "../constants";
import { PeriodTabs } from "../period-tabs";

export const metadata: Metadata = { title: "Popular · Explore · Pigxel" };
export const dynamic = "force-dynamic";

/** Arts on one page: fills whole rows of 2, 3 and 6. */
const PAGE_SIZE = 18;

type Props = { searchParams: Promise<{ page?: string; period?: string }> };

/** Everyone's arts published in the period chosen, newest first, a page at a time. */
export default async function Popular({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;
  const asked = Number(params.page);
  const page = Number.isInteger(asked) && asked > 1 ? asked : 1;
  const period = PERIODS.find((p) => p.value === params.period) ?? PERIODS[0];
  const { tiles, count } = await listPublicTiles(
    page,
    PAGE_SIZE,
    period.days,
    user.id,
  );
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <>
      <h1 className="font-display text-4xl tracking-tight">Popular tiles</h1>
      <div className="pt-4">
        <PeriodTabs active={period.value} />
      </div>
      <div className="pt-8">
        {tiles.length ? (
          <>
            <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
              {tiles.map((tile) => (
                <ArtCard
                  key={tile.id}
                  tile={tile}
                  author={tile.author}
                  like={{ count: tile.likes, liked: tile.liked }}
                  isOwner={false}
                  onTogglePublic={() => {}}
                  onTogglePin={() => {}}
                />
              ))}
            </ul>
            {pages > 1 && (
              <Pager
                page={page}
                pages={pages}
                href={(to) =>
                  `/explore/popular?period=${period.value}&page=${to}`
                }
              />
            )}
          </>
        ) : (
          <EmptyState
            title="No arts here yet"
            description={
              page > 1
                ? "This page is past the last one."
                : "Published arts from everyone will show up here."
            }
            action={
              page > 1 && (
                <Link
                  href={`/explore/popular?period=${period.value}`}
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Back to the first page
                </Link>
              )
            }
          />
        )}
      </div>
    </>
  );
}
