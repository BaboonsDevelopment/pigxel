import type { Metadata } from "next";
import Link from "next/link";
import { cardVariants } from "@pigxel/ui/components/card";
import { Page } from "@pigxel/ui/components/page";
import { Heading, linkVariants, Text } from "@pigxel/ui/components/typography";
import { requireUser } from "@/lib/auth/session";
import { kindOf, pageFrom } from "@/features/feedback/feedback";
import { countOwnOpen } from "@/features/feedback/server";
import { NewFeedbackForm } from "@/features/feedback/components/new-feedback-form";

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
      <Link href="/feedback" className={linkVariants({ variant: "accent" })}>
        <span aria-hidden="true">←</span> Feedback
      </Link>
      <Heading size="page" className="mt-2">
        Report a bug or request a feature
      </Heading>
      <Text tone="muted" className="mt-1">
        Keep it short and clear: others will find it on the board and vote for
        it.
      </Text>
      <section className={cardVariants({ padding: "lg", className: "mt-8" })}>
        <NewFeedbackForm
          initialKind={kindOf(kind)}
          open={open}
          page={pageFrom(from)}
        />
      </section>
    </Page>
  );
}
