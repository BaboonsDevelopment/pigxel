import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Page } from "@pigxel/ui/components/page";
import { cn } from "@pigxel/ui/lib/utils";
import {
  ACTIVE_STATUSES,
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  kindOf,
  pageFrom,
  type FeedbackItem,
  type FeedbackKind,
  type FeedbackStatus,
} from "@/lib/feedback/feedback";
import {
  countFeedback,
  listFeedback,
  type BoardQuery,
} from "@/lib/feedback/server";
import { VoteButton } from "./vote-button";

export const metadata: Metadata = { title: "Feedback · Pigxel" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    kind?: string;
    state?: string;
    sort?: string;
    q?: string;
    from?: string;
  }>;
};

/**
 * The feedback board, like issues on GitHub: feature requests and bugs,
 * open or closed, most voted or newest first, and searchable by title.
 */
export default async function Feedback({ searchParams }: Props) {
  const params = await searchParams;
  const query: BoardQuery = {
    kind: kindOf(params.kind),
    state: params.state === "closed" ? "closed" : "open",
    sort: params.sort === "newest" ? "newest" : "votes",
    search: (params.q ?? "").slice(0, 100),
  };
  const [items, counts] = await Promise.all([
    listFeedback(query),
    countFeedback(query.kind),
  ]);
  const from = pageFrom(params.from);
  const link = (change: Partial<BoardQuery>) =>
    boardUrl({ ...query, ...change });
  const newUrl = (kind: FeedbackKind) =>
    `/feedback/new?kind=${kind}${from ? `&from=${encodeURIComponent(from)}` : ""}`;

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Feedback</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Vote for what you’d like next, or tell us what’s broken. The team
            reads every report and moves it along as it’s looked at.
          </p>
        </div>
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
      </div>

      <nav aria-label="Kind" className="mt-6 flex gap-1 border-b">
        {(Object.keys(FEEDBACK_KINDS) as FeedbackKind[]).map((kind) => (
          <Link
            key={kind}
            href={link({ kind, state: "open", search: "" })}
            aria-current={kind === query.kind ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              kind === query.kind
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {FEEDBACK_KINDS[kind].label}
          </Link>
        ))}
      </nav>

      <section
        aria-label={FEEDBACK_KINDS[query.kind].label}
        className="mt-4 overflow-hidden rounded-2xl border bg-card"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-muted/40 px-4 py-2.5">
          <div className="flex gap-3 text-sm">
            {(["open", "closed"] as const).map((state) => (
              <Link
                key={state}
                href={link({ state })}
                aria-current={state === query.state ? "page" : undefined}
                className={cn(
                  "tabular-nums",
                  state === query.state
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {state === "open" ? "◯" : "✓"} {counts[state]}{" "}
                {state === "open" ? "Open" : "Closed"}
              </Link>
            ))}
          </div>
          <form
            action="/feedback"
            role="search"
            className="min-w-40 flex-1 sm:max-w-xs"
          >
            <input type="hidden" name="kind" value={query.kind} />
            <input type="hidden" name="state" value={query.state} />
            <input type="hidden" name="sort" value={query.sort} />
            <input
              type="search"
              name="q"
              defaultValue={query.search}
              maxLength={100}
              aria-label="Search titles"
              placeholder="Search titles…"
              className="h-8 w-full rounded-md border bg-background px-2.5 text-sm"
            />
          </form>
          <div className="ml-auto flex items-center gap-1 text-sm">
            <span className="mr-1 text-muted-foreground">Sort</span>
            {(["votes", "newest"] as const).map((sort) => (
              <Link
                key={sort}
                href={link({ sort })}
                aria-current={sort === query.sort ? "page" : undefined}
                className={cn(
                  "rounded-md px-2 py-0.5",
                  sort === query.sort
                    ? "bg-background font-medium shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {sort === "votes" ? "Most votes" : "Newest"}
              </Link>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {query.search
              ? `Nothing ${query.state} matches “${query.search}”.`
              : query.state === "open"
                ? `No open ${FEEDBACK_KINDS[query.kind].one}s. `
                : `No closed ${FEEDBACK_KINDS[query.kind].one}s yet.`}
            {!query.search && query.state === "open" && (
              <Link
                href={newUrl(query.kind)}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {FEEDBACK_KINDS[query.kind].new}
              </Link>
            )}
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <BoardItem key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

function boardUrl(query: BoardQuery) {
  const params = new URLSearchParams({ kind: query.kind });
  if (query.state === "closed") params.set("state", "closed");
  if (query.sort === "newest") params.set("sort", "newest");
  if (query.search) params.set("q", query.search);
  return `/feedback?${params}`;
}

function BoardItem({ item }: { item: FeedbackItem }) {
  return (
    <li id={`feedback-${item.id}`} className="flex gap-4 px-4 py-4">
      <VoteButton
        id={item.id}
        title={item.title}
        votes={item.votes}
        voted={item.voted}
        open={ACTIVE_STATUSES.includes(item.status)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
          <h3 className="min-w-0 font-semibold break-words">{item.title}</h3>
          <StatusBadge status={item.status} />
        </div>
        <p className="mt-1 text-sm break-words whitespace-pre-line text-foreground/80">
          {item.description}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          #{item.id} opened <time dateTime={item.createdAt}>{item.ago}</time> by{" "}
          {item.author ? (
            <Link
              href={`/u/${item.author.username}`}
              className="font-medium text-foreground hover:underline"
            >
              @{item.author.username}
            </Link>
          ) : (
            "a Pigxel artist"
          )}
        </p>
      </div>
    </li>
  );
}

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  open: "border-[#7cc48a] text-[#2f7a3f]",
  approved: "border-transparent bg-[#e9e4f5] text-[#5b3f8f]",
  in_development: "border-transparent bg-[#fde8ef] text-[#a9487a]",
  implemented: "border-transparent bg-success/15 text-success",
  declined: "border-transparent bg-muted text-muted-foreground",
  closed: "border-transparent bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {FEEDBACK_STATUSES[status]}
    </span>
  );
}
