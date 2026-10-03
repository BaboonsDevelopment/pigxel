import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@pigxel/ui/components/page";
import { requireUser } from "@/lib/auth/session";
import { kindOf, pageFrom } from "@/lib/feedback/feedback";
import { countOwnOpen } from "@/lib/feedback/server";
import { NewFeedbackForm } from "./new-feedback-form";

export const metadata: Metadata = { title: "New feedback · Pigxel" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ kind?: string; from?: string }> };

export default async function NewFeedback({ searchParams }: Props) {
  const [{ kind, from }, user] = await Promise.all([
    searchParams,
    requireUser(),
  ]);
  const open = await countOwnOpen(user.id);
  return (
    <Page width="narrow">
      <Link
        href="/feedback"
        className="text-xs font-medium text-[#9a78d0] hover:underline"
      >
        <span aria-hidden="true">←</span> Feedback
      </Link>
      <h1 className="mt-2 font-display text-4xl tracking-tight">
        Report a bug or request a feature
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Keep it short and clear: others will find it on the board and vote for
        it.
      </p>
      <section className="mt-8 rounded-2xl border bg-card p-6">
        <NewFeedbackForm
          initialKind={kindOf(kind)}
          open={open}
          page={pageFrom(from)}
        />
      </section>
    </Page>
  );
}
