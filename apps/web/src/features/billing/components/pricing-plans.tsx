"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { Notice } from "@pigxel/ui/components/notice";
import { cn } from "@pigxel/ui/lib/utils";
import { CURRENCY, FREE_PLAN, TIERS, type BillingCycle } from "../pricing";
import { loginUrl } from "@/lib/auth/routes";
import { startCheckout } from "../actions";
import { formatMoney } from "../subscription";
import { annualComparison, type PriceQuote } from "../pricing-comparison";
import { Badge } from "@pigxel/ui/components/badge";
import { Heading, Text } from "@pigxel/ui/components/typography";

const CYCLES: { id: BillingCycle; label: string }[] = [
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
];

const quote = (cents: number): PriceQuote => ({
  formattedTotal: formatMoney(String(cents), CURRENCY),
  total: String(cents),
  currencyCode: CURRENCY,
});

type Props = {
  signedIn?: boolean;
  /** The subscriber's current product; they change plans instead of buying another. */
  currentProductId?: string;
  /** Creem couldn't start a checkout last time. */
  checkoutFailed?: boolean;
  heading: ReactNode;
};

export function PricingPlans({
  signedIn,
  currentProductId,
  checkoutFailed,
  heading,
}: Props) {
  const [cycle, setCycle] = useState<BillingCycle>("month");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        {heading}
        <div className="flex flex-col items-start gap-1.5 md:ml-auto md:items-end">
          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex rounded-full border bg-background p-1.5 shadow-sm"
          >
            {CYCLES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={cycle === id}
                onClick={() => setCycle(id)}
                className={cn(
                  "rounded-full px-6 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  cycle === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Text size="xs" tone="muted" className="md:text-right">
            {cycle === "year"
              ? "One yearly payment. Compare it with 12 months of monthly billing."
              : "Billed monthly. Choose yearly to see your annual savings."}{" "}
            Prices in USD, plus tax where it applies.
          </Text>
        </div>
      </div>

      {checkoutFailed && (
        <Notice tone="error" className="mx-auto mt-6 max-w-xl text-center">
          Couldn’t open the checkout. Please try again in a moment.
        </Notice>
      )}

      <div className="flex flex-1 items-center pt-8 pb-2 lg:[@media(max-height:820px)]:pt-6 lg:[@media(max-height:740px)]:pt-4">
        <ul className="grid w-full items-stretch gap-x-4 gap-y-9 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-5">
          <li>
            <PlanCard
              name={FREE_PLAN.name}
              description={FREE_PLAN.description}
              features={FREE_PLAN.features}
              price={
                <Price amount="Free" note="No card or subscription needed" />
              }
              action={
                <Link
                  href={loginUrl("signup")}
                  className={buttonVariants({
                    variant: "primary",
                    size: "lg",
                    className: "w-full",
                  })}
                >
                  Start for free
                </Link>
              }
            />
          </li>
          {TIERS.map((tier) => {
            const productId = tier.productId[cycle];
            const comparison =
              cycle === "year"
                ? annualComparison(
                    quote(tier.price.month),
                    quote(tier.price.year),
                  )
                : undefined;
            return (
              <li key={tier.name}>
                <PlanCard
                  name={tier.name}
                  description={tier.description}
                  features={tier.features}
                  highlighted={tier.highlighted}
                  price={
                    <Price
                      amount={quote(tier.price[cycle]).formattedTotal}
                      period={`/ ${cycle}`}
                      comparison={comparison}
                      note={`Renews ${cycle === "year" ? "yearly" : "monthly"} until you cancel · Plus any tax`}
                    />
                  }
                  action={
                    currentProductId === productId ? (
                      <Button
                        className="w-full"
                        size="lg"
                        variant="secondary"
                        disabled
                      >
                        Your plan
                      </Button>
                    ) : currentProductId ? (
                      <Link
                        href={`/settings/subscription?plan=${productId}`}
                        className={buttonVariants({
                          variant: "primary",
                          size: "lg",
                          className: "w-full",
                        })}
                      >
                        Change plan
                      </Link>
                    ) : signedIn ? (
                      <form action={startCheckout.bind(null, productId)}>
                        <SubscribeButton
                          label={`Subscribe to ${tier.name}, billed ${cycle === "year" ? "yearly" : "monthly"}`}
                        />
                      </form>
                    ) : (
                      <Link
                        href={loginUrl("signup", "/pricing")}
                        className={buttonVariants({
                          variant: "primary",
                          size: "lg",
                          className: "w-full",
                        })}
                      >
                        Sign up to subscribe
                      </Link>
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SubscribeButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full"
      size="lg"
      variant="primary"
      disabled={pending}
      aria-label={label}
    >
      {pending ? "Opening checkout…" : "Subscribe"}
    </Button>
  );
}

function Price({
  amount,
  period,
  note,
  comparison,
}: {
  amount: string;
  period?: string;
  note: string;
  comparison?: ReturnType<typeof annualComparison>;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <Heading as="span" size="page">
          {amount}
        </Heading>
        {period && (
          <Text as="span" tone="muted">
            {period}
          </Text>
        )}
      </div>
      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {comparison && (
          <>
            <span className="sr-only">Twelve months at the monthly rate: </span>
            <s className="decoration-1">{comparison.regularPrice}</s>
            <Badge tone="accent" size="md">
              {comparison.savingsPercent > 0
                ? `Save ${comparison.savingsPercent}%`
                : "Annual savings"}
            </Badge>
          </>
        )}
        <span className={comparison ? "basis-full" : undefined}>{note}</span>
      </div>
    </div>
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
      aria-label={`${name} plan${highlighted ? ", recommended" : ""}`}
      className={cn(
        "relative flex h-full min-w-0 flex-col rounded-2xl border bg-card p-4 pt-7 xl:p-5 xl:pt-7 lg:[@media(max-height:820px)]:pt-6",
        highlighted &&
          "border-primary bg-primary/5 ring-2 ring-primary shadow-[0_18px_50px_-18px_var(--color-primary)] lg:-translate-y-2",
      )}
    >
      {highlighted && (
        <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-xs font-semibold whitespace-nowrap text-primary-foreground">
          <span aria-hidden="true">✦</span> Recommended
        </span>
      )}
      <Heading
        size="title"
        className={cn("tracking-normal", highlighted && "text-primary")}
      >
        {name}
      </Heading>
      <Text
        tone="muted"
        className="mt-1.5 min-h-10 leading-snug lg:[@media(max-height:740px)]:min-h-9 lg:[@media(max-height:740px)]:leading-tight"
      >
        {description}
      </Text>
      <div className="mt-3 min-h-16" aria-live="polite" aria-atomic="true">
        {price}
      </div>
      <div className="mt-3">{action}</div>
      <ul className="mt-5 flex-1 space-y-2 border-t pt-5 text-[13px] lg:[@media(max-height:820px)]:mt-4 lg:[@media(max-height:820px)]:space-y-1.5 lg:[@media(max-height:740px)]:space-y-1 lg:[@media(max-height:820px)]:pt-4 lg:[@media(max-height:820px)]:text-xs">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5 leading-snug">
            <svg
              className="mt-0.5 size-4 shrink-0 text-primary"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m4 10 4 4 8-8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}
