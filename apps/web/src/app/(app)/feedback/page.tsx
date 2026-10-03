import type { Metadata } from "next";
import Link from "next/link";
import { Badge, type BadgeTone } from "@pigxel/ui/components/badge";
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
              label: `${counts[state]} ${state === "open" ? "Open" : "Closed"}`,
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

        {items.length === 0 ? (
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
        <Text size="xs" tone="muted" className="mt-2">
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
        </Text>
      </div>
    </li>
  );
}

const STATUS_TONES: Record<FeedbackStatus, BadgeTone> = {
  open: "open",
  approved: "lavender",
  in_development: "pink",
  implemented: "success",
  declined: "muted",
  closed: "muted",
};

function StatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]} size="md">
      {FEEDBACK_STATUSES[status]}
    </Badge>
  );
}
