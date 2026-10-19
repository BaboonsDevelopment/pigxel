import { notFound } from "next/navigation";
import { BackButton } from "@/components/navigation/back-button";
import { Page } from "@pigxel/ui/components/page";
import { Heading, Text } from "@pigxel/ui/components/typography";
import { requireUser, isAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listFeedback } from "@/features/feedback/server";
import { BoardItem } from "@/features/feedback/components/board-item";
import {
  FEEDBACK_STATUSES,
  type FeedbackStatus,
} from "@/features/feedback/feedback";

export const metadata = {
  title: "Feedback · Pigxel",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function FeedbackDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [item] = await listFeedback(
    { kind: "feature", state: "open", sort: "newest", search: "", id },
    1,
  );
  if (!item) notFound();
  const supabase = await createClient();
  const { data: history, error } = await supabase
    .from("feedback_status_history")
    .select("id, status, created_at")
    .eq("feedback_id", id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<{ id: number; status: FeedbackStatus; created_at: string }[]>();
  return (
    <Page width="narrow">
      <BackButton href={`/feedback?kind=${item.kind}`} />
      <Heading size="page" className="mt-6">
        Feedback #{id}
      </Heading>
      <ul className="mt-4 rounded-xl border bg-background">
        <BoardItem item={item} admin={isAdmin(user)} />
      </ul>
      <section className="mt-8" aria-labelledby="feedback-history">
        <Heading id="feedback-history" size="section">
          Status history
        </Heading>
        {error ? (
          <Text tone="error" className="mt-3">
            Couldn’t load the status history. Refresh to try again.
          </Text>
        ) : (
          <ul className="mt-3 space-y-3">
            {(history ?? []).map((entry) => (
              <li key={entry.id} className="text-sm">
                {FEEDBACK_STATUSES[entry.status]} ·{" "}
                <time
                  dateTime={entry.created_at}
                  className="text-muted-foreground"
                >
                  {new Date(entry.created_at).toLocaleString("en-US", {
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </li>
            ))}
            <li className="text-sm">
              Submitted ·{" "}
              <time dateTime={item.createdAt} className="text-muted-foreground">
                {new Date(item.createdAt).toLocaleString("en-US", {
                  timeZone: "UTC",
                })}{" "}
                UTC
              </time>
            </li>
          </ul>
        )}
      </section>
    </Page>
  );
}
