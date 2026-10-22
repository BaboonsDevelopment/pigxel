import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@pigxel/ui/components/card";
import { Notice } from "@pigxel/ui/components/notice";
import {
  Lead,
  SectionTitle,
  Text,
  textLinkClassName,
} from "@pigxel/ui/components/typography";
import { requireUser } from "@/lib/auth/session";
import { getCurrentPlan } from "@/features/billing/server";
import { ManagePlan } from "@/features/billing/components/manage-plan";
import { getSubscriptionUsage } from "@/features/billing/usage";
import { SubscriptionUsage } from "@/features/billing/components/subscription-usage";
import { SubscriptionSupport } from "@/features/billing/components/subscription-support";

export const metadata: Metadata = { title: "Subscription · Pigxel" };
export const dynamic = "force-dynamic";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { dateStyle: "long" });

export default async function SubscriptionSettings({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const { billing } = await searchParams;
  const user = await requireUser();
  const [plan, usage] = await Promise.all([
    getCurrentPlan(user.id),
    getSubscriptionUsage(user.id),
  ]);
  const periodEnd =
    plan.name === "Free" ? null : (plan.renewsAt ?? plan.cancelsAt);
  return (
    <section aria-labelledby="plan-heading">
      {billing === "error" && (
        <Notice tone="error" className="mb-4">
          Couldn’t open Creem’s billing page. Please try again in a moment.
        </Notice>
      )}
      <SectionTitle id="plan-heading">Your plan</SectionTitle>
      <Card className="mt-4">
        <Text tone="muted">Current plan</Text>
        <p className="mt-1 text-2xl font-semibold">
          {plan.name}
          {plan.name !== "Free" && (
            <Text as="span" size="md" tone="muted" className="ml-2 font-normal">
              billed {plan.cycle === "month" ? "monthly" : "yearly"}
            </Text>
          )}
        </p>
        <Lead className="mt-3">
          {plan.name === "Free"
            ? "Artist and Pro plans are on the Pricing page."
            : plan.status === "past_due"
              ? "Your last payment didn’t go through. Creem will retry it; update your payment method below to fix it sooner."
              : plan.cancelsAt
                ? `Your plan ends on ${day(plan.cancelsAt)} and won’t renew.`
                : plan.renewsAt
                  ? `Your plan renews on ${day(plan.renewsAt)}.`
                  : "Your plan is active."}
        </Lead>
        <p className="mt-4 text-sm">
          <Link href="/pricing" className={textLinkClassName}>
            See plans and pricing
          </Link>
          {" · "}
          <Link href="/refunds" className={textLinkClassName}>
            Refund Policy
          </Link>
        </p>
      </Card>
      <SubscriptionUsage plan={plan.name} usage={usage} />
      {plan.name !== "Free" && (
        <ManagePlan plan={plan} periodEnd={periodEnd && day(periodEnd)} />
      )}
      <Card className="mt-6">
        <SectionTitle>Your member perks</SectionTitle>
        <Text tone="muted" className="mt-2">
          {plan.name === "Free"
            ? "Manage badges you’ve received, or explore the perks included with a paid plan."
            : "Gift custom badges, manage your received gifts, and build your hiring portfolio."}
        </Text>
        <Link
          href="/settings/perks"
          className={`${textLinkClassName} mt-3 inline-block`}
        >
          Manage member perks →
        </Link>
      </Card>
      <SubscriptionSupport plan={plan} email={user.email} />
    </section>
  );
}
