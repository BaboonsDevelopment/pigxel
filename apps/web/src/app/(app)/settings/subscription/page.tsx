import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@pigxel/ui/components/card";
import {
  Lead,
  SectionTitle,
  Text,
  textLinkClassName,
} from "@pigxel/ui/components/typography";
import { requireUser } from "@/lib/auth/session";
import { getCurrentPlan } from "@/features/billing/server";

export const metadata: Metadata = { title: "Subscription · Pigxel" };
export const dynamic = "force-dynamic";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { dateStyle: "long" });

export default async function SubscriptionSettings() {
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);
  return (
    <section aria-labelledby="plan-heading">
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
            ? "Starter, Pro and Advanced plans are on the Pricing page."
            : plan.status === "past_due"
              ? "Your last payment didn’t go through. Paddle will retry it and email you how to update your card."
              : plan.cancelsAt
                ? `Your plan ends on ${day(plan.cancelsAt)} and won’t renew.`
                : plan.renewsAt
                  ? `Your plan renews on ${day(plan.renewsAt)}.`
                  : "Your plan is active."}{" "}
          Soon you’ll also change your plan and payment method and see invoices
          here.
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
    </section>
  );
}
