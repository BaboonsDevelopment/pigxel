import type { Metadata } from "next";
import Link from "next/link";
import { Badge, type BadgeTone } from "@pigxel/ui/components/badge";
import { cardVariants } from "@pigxel/ui/components/card";
import { Page } from "@pigxel/ui/components/page";
import { linkVariants, Text } from "@pigxel/ui/components/typography";
import {
  ACTIVE_STATUSES,
  pageFrom,
  ROADMAP_STATUSES,
  type RoadmapStatus,
} from "@/features/feedback/feedback";
import { listRoadmap } from "@/features/feedback/server";
import {
  FeedbackHeader,
  ROADMAP_PATH,
} from "@/features/feedback/components/feedback-header";
import { VoteButton } from "@/features/feedback/components/vote-button";

export const metadata: Metadata = { title: "Roadmap · Pigxel" };
export const dynamic = "force-dynamic";

/** The most a column shows, most voted first. */
const PER_COLUMN = 30;

const COLUMNS: Record<
  RoadmapStatus,
  { title: string; empty: string; tone: BadgeTone }
> = {
  approved: {
    title: "Planned",
    empty: "Nothing planned yet.",
    tone: "lavender",
  },
  in_development: {
    title: "In development",
    empty: "Nothing being built right now.",
    tone: "pink",
  },
  implemented: {
    title: "Shipped",
    empty: "Nothing shipped yet.",
    tone: "success",
  },
};

type Props = { searchParams: Promise<{ from?: string }> };

export default async function Roadmap({ searchParams }: Props) {
  const from = pageFrom((await searchParams).from);
  const roadmap = await listRoadmap(PER_COLUMN).catch((error: unknown) => {
    console.error(error);
    return null;
  });

  return (
    <Page>
      <FeedbackHeader active="roadmap" from={from} />

      {!roadmap ? (
        <Text role="alert" className="mt-4 px-4 py-12 text-center">
          Couldn’t load the roadmap.{" "}
          <Link href={ROADMAP_PATH} className={linkVariants()}>
            Try again
          </Link>
        </Text>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {ROADMAP_STATUSES.map((status) => {
            const column = COLUMNS[status];
            const items = roadmap[status];
            return (
              <section
                key={status}
                aria-labelledby={`roadmap-${status}`}
                className={cardVariants({
                  padding: "none",
                  className: "flex flex-col overflow-hidden",
                })}
              >
                <header className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                  <h2 id={`roadmap-${status}`} className="font-semibold">
                    {column.title}
                  </h2>
                  <Badge tone={column.tone} size="md">
                    {items.length}
                    {items.length === PER_COLUMN && "+"}
                  </Badge>
                </header>
                {items.length ? (
                  <ul className="divide-y">
                    {items.map((item) => (
                      <li key={item.id} className="flex gap-3 px-4 py-3">
                        <VoteButton
                          id={item.id}
                          title={item.title}
                          votes={item.votes}
                          voted={item.voted}
                          open={ACTIVE_STATUSES.includes(item.status)}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/feedback/${item.id}`}
                            className="font-medium break-words hover:underline"
                          >
                            {item.title}
                          </Link>
                          <Text size="xs" tone="muted" className="mt-1">
                            #{item.id} ·{" "}
                            <time dateTime={item.createdAt}>{item.ago}</time>
                          </Text>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text tone="muted" className="px-4 py-10 text-center">
                    {column.empty}
                  </Text>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
