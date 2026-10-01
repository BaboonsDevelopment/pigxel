import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { cn } from "@pigxel/ui/lib/utils";
import { ArtCard } from "@/components/profile/art-card";
import { requireUser } from "@/lib/auth/session";
import { listPublicTiles } from "@/lib/profile/server";

export const metadata: Metadata = { title: "Popular · Explore · Pigxel" };
export const dynamic = "force-dynamic";

/** Arts on one page: fills whole rows of 2, 3, 4 and 6. */
const PAGE_SIZE = 24;

type Props = { searchParams: Promise<{ page?: string }> };

/** Everyone's published arts, newest first, a page at a time. */
export default async function Popular({ searchParams }: Props) {
  await requireUser();
  const asked = Number((await searchParams).page);
  const page = Number.isInteger(asked) && asked > 1 ? asked : 1;
  const { tiles, count } = await listPublicTiles(page, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  if (!tiles.length)
    return (
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
              href="/explore/popular"
              className={buttonVariants({ variant: "secondary" })}
            >
              Back to the first page
            </Link>
          )
        }
      />
    );

  return (
    <>
      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {tiles.map((tile) => (
          <ArtCard
            key={tile.id}
            tile={tile}
            isOwner={false}
            onTogglePublic={() => {}}
            onTogglePin={() => {}}
          />
        ))}
      </ul>
      {pages > 1 && <Pager page={page} pages={pages} />}
    </>
  );
}

/** Previous and next page, and where in the pages this is. */
function Pager({ page, pages }: { page: number; pages: number }) {
  const link = (to: number, label: string, enabled: boolean) => (
    <Link
      href={`/explore/popular?page=${to}`}
      aria-disabled={!enabled}
      tabIndex={enabled ? undefined : -1}
      className={cn(
        buttonVariants({ variant: "secondary" }),
        !enabled && "pointer-events-none opacity-50",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav
      aria-label="Pages"
      className="mt-10 flex items-center justify-center gap-4"
    >
      {link(page - 1, "Previous", page > 1)}
      <span className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {pages}
      </span>
      {link(page + 1, "Next", page < pages)}
    </nav>
  );
}
