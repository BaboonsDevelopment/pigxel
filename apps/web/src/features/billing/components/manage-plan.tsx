"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@pigxel/ui/components/button";
import { ChoiceCard, ChoiceText, Radio } from "@pigxel/ui/components/choice";
import { FormMessage } from "@pigxel/ui/components/field";
import { Notice } from "@pigxel/ui/components/notice";
import { SectionTitle, Text } from "@pigxel/ui/components/typography";
import {
  cancelPlan,
  changePlan,
  keepPlan,
  openBillingPortal,
  previewPlanChange,
  type PlanPreview,
} from "../actions";
import {
  BILLABLE_TIERS,
  productIdFor,
  type BillingMode,
  type BillingCycle,
} from "../pricing";
import {
  canChangePlan,
  planOfProduct,
  type CurrentPlan,
} from "../subscription";

type PaidPlan = Exclude<CurrentPlan, { name: "Free" }>;

const billed = (cycle: BillingCycle) =>
  cycle === "month" ? "billed monthly" : "billed yearly";

const labelOf = (productId: string) => {
  const plan = planOfProduct(productId);
  return plan ? `${plan.name}, ${billed(plan.cycle)}` : "";
};

export function ManagePlan({
  billingMode,
  plan,
  periodEnd,
  chosen: initial,
}: {
  billingMode: BillingMode;
  plan: PaidPlan;
  periodEnd: string | null;
  /** A plan picked on the Pricing page, previewed straight away. */
  chosen?: string;
}) {
  const options = BILLABLE_TIERS.flatMap((tier) =>
    (["month", "year"] as const).map((cycle) =>
      productIdFor(tier, cycle, billingMode),
    ),
  ).filter(Boolean);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const until = periodEnd ?? "the end of this billing period";

  const run = (action: () => Promise<{ error?: string } | void>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result?.error) setError(result.error);
      else {
        setPreview(null);
        setCancelling(false);
      }
    });

  const choose = (productId: string) =>
    startTransition(async () => {
      setError(null);
      setPreview(null);
      setPreview(await previewPlanChange(productId));
    });

  useEffect(() => {
    if (initial && initial !== plan.productId && canChangePlan(plan))
      choose(initial);
    // Only for the plan the page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chosen = preview && "change" in preview ? preview : null;
  const message =
    error ?? (preview && "error" in preview ? preview.error : null);

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

      {canChangePlan(plan) && (
        <section aria-labelledby="change-plan-heading">
          <SectionTitle id="change-plan-heading">Change plan</SectionTitle>
          <Text tone="muted" className="mt-1">
            Upgrades start right away and you pay the difference for the rest of
            this period. Downgrades start when your plan renews.
          </Text>
          <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
            <legend className="sr-only">New plan</legend>
            {options
              .filter((id) => id !== plan.productId)
              .map((id) => (
                <ChoiceCard key={id} className="p-3">
                  <Radio
                    name="new-plan"
                    disabled={pending}
                    checked={chosen?.productId === id}
                    onChange={() => choose(id)}
                  />
                  <ChoiceText title={labelOf(id)} />
                </ChoiceCard>
              ))}
          </fieldset>
          {chosen && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <Text className="max-w-prose">
                {chosen.change === "upgrade"
                  ? `You’ll switch to ${labelOf(chosen.productId)} now and pay the prorated difference for the rest of this period today.`
                  : `You’ll keep ${plan.name} until ${until}, then switch to ${labelOf(chosen.productId)}. Nothing is charged now.`}
              </Text>
              <Button
                disabled={pending}
                onClick={() => run(() => changePlan(chosen.productId))}
              >
                {chosen.change === "upgrade"
                  ? "Upgrade now"
                  : "Switch at renewal"}
              </Button>
            </div>
          )}
        </section>
      )}

      {message && <FormMessage tone="error">{message}</FormMessage>}

      <section aria-labelledby="billing-heading">
        <SectionTitle id="billing-heading">Billing</SectionTitle>
        <Text tone="muted" className="mt-1">
          Creem, our payment provider, keeps your card and invoices.
        </Text>
        <div className="mt-4 flex flex-wrap gap-2">
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
