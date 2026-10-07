"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@pigxel/ui/components/button";
import { ChoiceCard, ChoiceText, Radio } from "@pigxel/ui/components/choice";
import { FormMessage } from "@pigxel/ui/components/field";
import { Notice } from "@pigxel/ui/components/notice";
import { SectionTitle, Text } from "@pigxel/ui/components/typography";
import {
  changePlan,
  keepPlan,
  openBillingPortal,
  previewPlanChange,
  type PlanPreview,
  type PortalTarget,
} from "../actions";
import { TIERS, type BillingCycle } from "../pricing";
import { canChangePlan, planOfPrice, type CurrentPlan } from "../subscription";

type PaidPlan = Exclude<CurrentPlan, { name: "Free" }>;

const billed = (cycle: BillingCycle) =>
  cycle === "month" ? "billed monthly" : "billed yearly";

const labelOf = (priceId: string) => {
  const plan = planOfPrice(priceId);
  return plan ? `${plan.name}, ${billed(plan.cycle)}` : "";
};

const OPTIONS = TIERS.flatMap((tier) =>
  (["month", "year"] as const).map((cycle) => tier.priceId[cycle]),
);

export function ManagePlan({
  plan,
  periodEnd,
  chosen: initial,
}: {
  plan: PaidPlan;
  periodEnd: string | null;
  /** A plan picked on the Pricing page, previewed straight away. */
  chosen?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const until = periodEnd ?? "the end of this billing period";

  const run = (action: () => Promise<{ error?: string } | void>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result?.error) setError(result.error);
      else setPreview(null);
    });

  const choose = (priceId: string) =>
    startTransition(async () => {
      setError(null);
      setPreview(null);
      setPreview(await previewPlanChange(priceId));
    });

  useEffect(() => {
    if (initial && initial !== plan.priceId && canChangePlan(plan))
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
            {OPTIONS.filter((id) => id !== plan.priceId).map((id) => (
              <ChoiceCard key={id} className="p-3">
                <Radio
                  name="new-plan"
                  disabled={pending}
                  checked={chosen?.priceId === id}
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
                  ? `You’ll switch to ${labelOf(chosen.priceId)} now${
                      chosen.charge
                        ? ` and pay ${chosen.charge} today for the rest of this period.`
                        : "."
                    }`
                  : `You’ll keep ${plan.name} until ${until}, then switch to ${labelOf(chosen.priceId)}. Nothing is charged now.`}
              </Text>
              <Button
                disabled={pending}
                onClick={() => run(() => changePlan(chosen.priceId))}
              >
                {chosen.change === "upgrade"
                  ? `Upgrade${chosen.charge ? ` and pay ${chosen.charge}` : ""}`
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
          Paddle, our payment provider, keeps your card and invoices.
        </Text>
        <div className="mt-4 flex flex-wrap gap-2">
          <PortalButton target="payment">Update payment method</PortalButton>
          <PortalButton target="overview">Invoices and receipts</PortalButton>
          {plan.cancelsAt ? (
            <Button disabled={pending} onClick={() => run(keepPlan)}>
              Keep my plan
            </Button>
          ) : (
            <PortalButton target="cancel">Cancel plan</PortalButton>
          )}
        </div>
      </section>
    </div>
  );
}

function PortalButton({
  target,
  children,
}: {
  target: PortalTarget;
  children: string;
}) {
  return (
    <form action={openBillingPortal.bind(null, target)}>
      <Button type="submit" variant="secondary">
        {children}
      </Button>
    </form>
  );
}
