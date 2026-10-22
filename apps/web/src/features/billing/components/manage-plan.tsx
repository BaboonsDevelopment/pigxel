"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { Notice } from "@pigxel/ui/components/notice";
import { SectionTitle, Text } from "@pigxel/ui/components/typography";
import { cancelPlan, keepPlan, openBillingPortal } from "../actions";
import type { BillingCycle } from "../pricing";
import { canChangePlan, type CurrentPlan } from "../subscription";

type PaidPlan = Exclude<CurrentPlan, { name: "Free" }>;

const billed = (cycle: BillingCycle) =>
  cycle === "month" ? "billed monthly" : "billed yearly";

/** Billing for a paid plan. Plan changes happen on the Pricing page. */
export function ManagePlan({
  plan,
  periodEnd,
}: {
  plan: PaidPlan;
  periodEnd: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const until = periodEnd ?? "the end of this billing period";

  const run = (action: () => Promise<{ error?: string } | void>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result?.error) setError(result.error);
      else setCancelling(false);
    });

  return (
    <div className="mt-8 space-y-8">
      {plan.switchesTo && (
        <Notice className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Your plan switches to {plan.switchesTo.name},{" "}
            {billed(plan.switchesTo.cycle)}, on {until}.
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => run(keepPlan)}
          >
            Keep {plan.name}
          </Button>
        </Notice>
      )}

      {error && <FormMessage tone="error">{error}</FormMessage>}

      <section aria-labelledby="billing-heading">
        <SectionTitle id="billing-heading">Billing</SectionTitle>
        <Text tone="muted" className="mt-1">
          Creem, our payment provider, keeps your card and invoices.
        </Text>
        <div className="mt-4 flex flex-wrap gap-2">
          {canChangePlan(plan) && (
            <Link href="/pricing" className={buttonVariants()}>
              Change plan
            </Link>
          )}
          <form action={openBillingPortal}>
            <Button type="submit" variant="secondary">
              Payment method and invoices
            </Button>
          </form>
          {plan.cancelsAt ? (
            <Button disabled={pending} onClick={() => run(keepPlan)}>
              Keep my plan
            </Button>
          ) : (
            !cancelling && (
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => setCancelling(true)}
              >
                Cancel plan
              </Button>
            )
          )}
        </div>
        {cancelling && !plan.cancelsAt && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <Text className="max-w-prose">
              Your plan stays active until {until}, then you move to Free. You
              won’t be charged again.
            </Text>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => setCancelling(false)}
              >
                Keep {plan.name}
              </Button>
              <Button disabled={pending} onClick={() => run(cancelPlan)}>
                Cancel plan
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
