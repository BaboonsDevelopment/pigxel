import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { cardVariants } from "@pigxel/ui/components/card";
import { Input } from "@pigxel/ui/components/input";
import { Page } from "@pigxel/ui/components/page";
import {
  linkVariants,
  PageHeader,
  Text,
} from "@pigxel/ui/components/typography";
import { TabLinks } from "@/components/ui/tab-links";
import {
  boardUrl,
  FEEDBACK_KINDS,
  kindOf,
  pageFrom,
  type FeedbackKind,
} from "@/features/feedback/feedback";
import {
  countFeedback,
  listFeedback,
  type BoardQuery,
} from "@/features/feedback/server";
import { BoardItem } from "@/features/feedback/components/board-item";
import { shownFrom } from "@/lib/utils/shown";

const STEP = 50;

export const metadata: Metadata = { title: "Feedback · Pigxel" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    kind?: string;
    state?: string;
    sort?: string;
    q?: string;
    from?: string;
    shown?: string;
  }>;
};

export default async function Feedback({ searchParams }: Props) {
  const params = await searchParams;
  const query: BoardQuery = {
    kind: kindOf(params.kind),
    state: params.state === "closed" ? "closed" : "open",
    sort: params.sort === "newest" ? "newest" : "votes",
    search: (params.q ?? "").slice(0, 100),
  };
  const shown = shownFrom(params.shown, STEP);
  const [loaded, counts] = await Promise.all([
    listFeedback(query, shown + 1).catch((error: unknown) => {
      console.error(error);
      return null;
    }),
    countFeedback(query.kind),
  ]);
  const items = loaded?.slice(0, shown) ?? [];
  const more = (loaded?.length ?? 0) > shown;
  const from = pageFrom(params.from);
  const link = (change: Partial<BoardQuery>) =>
    boardUrl({ ...query, ...change });
  const newUrl = (kind: FeedbackKind) =>
    `/feedback/new?kind=${kind}${from ? `&from=${encodeURIComponent(from)}` : ""}`;

  return (
    <Page>
      <PageHeader
        title="Feedback"
        description="Vote for what you’d like next, or tell us what’s broken. The team reads every report and moves it along as it’s looked at."
        actions={
          <div className="flex gap-2">
            <Link
              href={newUrl("bug")}
              className={buttonVariants({ variant: "secondary" })}
            >
              Report a bug
            </Link>
            <Link href={newUrl("feature")} className={buttonVariants()}>
              Request a feature
            </Link>
          </div>
        }
      />

      <TabLinks
        label="Kind"
        className="mt-6"
        tabs={(Object.keys(FEEDBACK_KINDS) as FeedbackKind[]).map((kind) => ({
          href: link({ kind, state: "open", search: "" }),
          label: FEEDBACK_KINDS[kind].label,
          active: kind === query.kind,
        }))}
      />

      <section
        aria-label={FEEDBACK_KINDS[query.kind].label}
        className={cardVariants({
          padding: "none",
          className: "mt-4 overflow-hidden",
        })}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-muted/40 px-4 py-2.5">
          <TabLinks
            label="Open or closed"
            variant="segmented"
            size="sm"
            tabs={(["open", "closed"] as const).map((state) => ({
              href: link({ state }),
              label: `${counts ? `${counts[state]} ` : ""}${state === "open" ? "Open" : "Closed"}`,
              active: state === query.state,
            }))}
          />
          <form
            action="/feedback"
            role="search"
            className="min-w-40 flex-1 sm:max-w-xs"
          >
            <input type="hidden" name="kind" value={query.kind} />
            <input type="hidden" name="state" value={query.state} />
            <input type="hidden" name="sort" value={query.sort} />
            <Input
              type="search"
              name="q"
              inputSize="sm"
              defaultValue={query.search}
              maxLength={100}
              aria-label="Search titles"
              placeholder="Search titles…"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <Text as="span" tone="muted">
              Sort
            </Text>
            <TabLinks
              label="Sort"
              variant="segmented"
              size="sm"
              tabs={(["votes", "newest"] as const).map((sort) => ({
                href: link({ sort }),
                label: sort === "votes" ? "Most votes" : "Newest",
                active: sort === query.sort,
              }))}
            />
          </div>
        </div>

        {!loaded ? (
          <Text role="alert" className="px-4 py-12 text-center">
            Couldn’t load feedback.{" "}
            <Link href={link({})} className={linkVariants()}>
              Try again
            </Link>
          </Text>
        ) : items.length === 0 ? (
          <Text tone="muted" className="px-4 py-12 text-center">
            {query.search
              ? `Nothing ${query.state} matches “${query.search}”.`
              : query.state === "open"
                ? `No open ${FEEDBACK_KINDS[query.kind].one}s. `
                : `No closed ${FEEDBACK_KINDS[query.kind].one}s yet.`}
            {!query.search && query.state === "open" && (
              <Link href={newUrl(query.kind)} className={linkVariants()}>
                {FEEDBACK_KINDS[query.kind].new}
              </Link>
            )}
          </Text>
        ) : (
          <>
            <ul className="divide-y">
              {items.map((item) => (
                <BoardItem key={item.id} item={item} />
              ))}
            </ul>
            {more && (
              <div className="border-t px-4 py-3 text-center">
                <Link
                  href={`${link({})}&shown=${shown + STEP}`}
                  scroll={false}
                  className={linkVariants()}
                >
                  Show more
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </Page>
  );
}
