"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  initializePaddle,
  type Environments,
  type Paddle,
} from "@paddle/paddle-js";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { Notice } from "@pigxel/ui/components/notice";
import { Skeleton } from "@pigxel/ui/components/skeleton";
import { cn } from "@pigxel/ui/lib/utils";
import { FREE_PLAN, TIERS, type BillingCycle, type Tier } from "@/lib/pricing";

const CYCLES: { id: BillingCycle; label: string }[] = [
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
];

/** Paddle's formatted total for each price ID, as Paddle returned it. */
type Prices = Partial<Record<string, string>>;

type Props = {
  environment: Environments;
  /** Paddle client-side token; public by design. */
  token: string;
  /** ISO country from the request; without it Paddle uses the visitor's IP. */
  country?: string;
  /** The signed-in person, so checkout knows their email and account. */
  customer?: { id: string; email: string };
};

/**
 * The billing toggle and the plan cards. Prices are Paddle's totals for the
 * visitor's country, shown exactly as Paddle formats them; Subscribe opens
 * Paddle Checkout for the price on the card.
 */
export function PricingPlans({ environment, token, country, customer }: Props) {
  const [cycle, setCycle] = useState<BillingCycle>("month");
  const [paddle, setPaddle] = useState<Paddle>();
  const [prices, setPrices] = useState<Prices>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    initializePaddle({ environment, token })
      .then(async (instance) => {
        if (!instance) throw new Error("Paddle.js didn't load.");
        if (!active) return;
        setPaddle(instance);
        // One preview per cycle, so the toggle switches without a wait.
        const previews = await Promise.all(
          CYCLES.map(({ id }) =>
            instance.PricePreview({
              items: TIERS.map((tier) => ({
                priceId: tier.priceId[id],
                quantity: 1,
              })),
              ...(country && { address: { countryCode: country } }),
            }),
          ),
        );
        if (!active) return;
        setPrices(
          Object.fromEntries(
            previews.flatMap((preview) =>
              preview.data.details.lineItems.map((item) => [
                item.price.id,
                item.formattedTotals.total,
              ]),
            ),
          ),
        );
      })
      .catch((error: unknown) => {
        console.error("Couldn't load prices from Paddle", error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [environment, token, country]);

  function subscribe(tier: Tier) {
    paddle?.Checkout.open({
      items: [{ priceId: tier.priceId[cycle], quantity: 1 }],
      ...(customer && {
        customer: { email: customer.email },
        customData: { userId: customer.id },
      }),
      settings: {
        displayMode: "overlay",
        variant: "one-page",
        successUrl: `${window.location.origin}/welcome`,
      },
    });
  }

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex rounded-full border bg-background p-1"
        >
          {CYCLES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={cycle === id}
              onClick={() => setCycle(id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                cycle === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {failed && (
        <Notice tone="error" className="mx-auto mt-6 max-w-xl text-center">
          Couldn’t load prices. Refresh the page to try again.
        </Notice>
      )}

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <li>
          <PlanCard
            name={FREE_PLAN.name}
            description={FREE_PLAN.description}
            features={FREE_PLAN.features}
            price={<Price amount="Free" period="forever" />}
            action={
              <Link
                href="/login?mode=signup"
                className={buttonVariants({ className: "mt-6 w-full" })}
              >
                Start for free
              </Link>
            }
          />
        </li>
        {TIERS.map((tier) => {
          const amount = prices[tier.priceId[cycle]];
          return (
            <li key={tier.name}>
              <PlanCard
                name={tier.name}
                description={tier.description}
                features={tier.features}
                highlighted={tier.highlighted}
                price={
                  amount ? (
                    <Price amount={amount} period={`/ ${cycle}`} />
                  ) : failed ? (
                    <span className="text-sm text-muted-foreground">
                      Price unavailable
                    </span>
                  ) : (
                    <Skeleton
                      aria-label="Loading price"
                      className="h-10 w-32"
                    />
                  )
                }
                action={
                  <Button
                    className="mt-6 w-full"
                    variant={tier.highlighted ? undefined : "secondary"}
                    disabled={!paddle || !amount}
                    onClick={() => subscribe(tier)}
                  >
                    Subscribe
                  </Button>
                }
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Price({ amount, period }: { amount: string; period: string }) {
  return (
    <>
      <span className="font-display text-4xl tracking-tight">{amount}</span>
      <span className="text-sm text-muted-foreground">{period}</span>
    </>
  );
}

function PlanCard({
  name,
  description,
  features,
  highlighted,
  price,
  action,
}: {
  name: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  price: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-card p-6",
        highlighted &&
          "border-primary shadow-[0_18px_40px_-24px_var(--color-primary)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl">{name}</h2>
        {highlighted && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
            Most popular
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 flex min-h-10 flex-wrap items-baseline gap-1">
        {price}
      </div>
      <ul className="mt-6 flex-1 space-y-2 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden="true" className="text-primary">
              ✦
            </span>
            {feature}
          </li>
        ))}
      </ul>
      {action}
    </article>
  );
}
