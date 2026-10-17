"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { Notice } from "@pigxel/ui/components/notice";
import { cn } from "@pigxel/ui/lib/utils";
import {
  AI_PLAN,
  aiFeatures,
  ARTIST_PLAN,
  CREATOR_PLAN,
  CURRENCY,
  FREE_PLAN,
  TIERS,
  UPCOMING_PERKS,
  type BillingCycle,
} from "../pricing";
import { loginUrl } from "@/lib/auth/routes";
import { startCheckout } from "../actions";
import { CREATOR_CONTACT, creatorEmailHref } from "../creator-contact";
import { formatMoney, planOfProduct } from "../subscription";
import { annualComparison } from "../pricing-comparison";
import { Heading, Text } from "@pigxel/ui/components/typography";
import styles from "./pricing-plans.module.css";

const CYCLES: { id: BillingCycle; label: string }[] = [
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
];

/** "$7.00" reads as "$7"; prices with cents keep them. */
const money = (cents: number) =>
  formatMoney(String(Math.round(cents)), CURRENCY).replace(/[.,]00$/, "");

const savings = (price: Record<BillingCycle, number>) =>
  annualComparison(
    { formattedTotal: "", total: String(price.month), currencyCode: CURRENCY },
    { formattedTotal: "", total: String(price.year), currencyCode: CURRENCY },
  )?.savingsPercent ?? 0;

/** The best yearly saving across the paid plans, for the toggle. */
const BEST_SAVING = Math.max(0, ...TIERS.map((tier) => savings(tier.price)));

const DEFAULT_LEVEL = Math.max(
  0,
  TIERS.findIndex((tier) => tier.highlighted),
);

const short = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString("en-US")}K` : String(n);

const BUTTON = buttonVariants({
  variant: "primary",
  size: "lg",
  className: "w-full",
});
const BUTTON_SOFT = buttonVariants({
  variant: "secondary",
  size: "lg",
  className: "w-full",
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
  const current = currentProductId ? planOfProduct(currentProductId) : null;
  const [cycle, setCycle] = useState<BillingCycle>(current?.cycle ?? "month");
  // Subscribers start on their own level; everyone else on the recommended one.
  const [level, setLevel] = useState(() => {
    const own = TIERS.findIndex((tier) => tier.name === current?.name);
    return own >= 0 ? own : DEFAULT_LEVEL;
  });
  const tier = TIERS[level]!;
  const productId = tier.productId[cycle];

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        {heading}
        <div className="flex flex-col items-start gap-2 md:ml-auto md:items-end">
          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex rounded-full border bg-background p-1 shadow-sm"
          >
            {CYCLES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={cycle === id}
                onClick={() => setCycle(id)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  cycle === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                {id === "year" && BEST_SAVING > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      cycle === id
                        ? "bg-white/20 text-primary-foreground"
                        : "bg-pastel-pink-soft text-accent-pink",
                    )}
                  >
                    −{BEST_SAVING}%
                  </span>
                )}
              </button>
            ))}
          </div>
          <Text size="xs" tone="muted" className="md:text-right">
            Prices in USD, plus tax where it applies.
          </Text>
        </div>
      </div>

      {checkoutFailed && (
        <Notice tone="error" className="mx-auto mt-6 max-w-xl text-center">
          Couldn’t open the checkout. Please try again in a moment.
        </Notice>
      )}

      <ul className="mt-10 grid w-full gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-5">
        <PlanCard
          name={FREE_PLAN.name}
          description={FREE_PLAN.description}
          price={<Price amount={0} note="No card needed" />}
          action={
            signedIn ? (
              <span className={cn(BUTTON_SOFT, "pointer-events-none")}>
                Included
              </span>
            ) : (
              <Link href={loginUrl("signup")} className={BUTTON_SOFT}>
                Start for free
              </Link>
            )
          }
          features={FREE_PLAN.features}
        />
        <PlanCard
          name={ARTIST_PLAN.name}
          tag="No AI"
          description={ARTIST_PLAN.description}
          price={<CyclePrice price={ARTIST_PLAN.price} cycle={cycle} />}
          action={
            <Button className="w-full" size="lg" variant="secondary" disabled>
              Coming soon
            </Button>
          }
          features={ARTIST_PLAN.features}
        />
        <PlanCard
          name={AI_PLAN.name}
          tag="Most popular"
          highlighted
          description={AI_PLAN.description}
          picker={<TokenSlider level={level} onLevel={setLevel} />}
          price={<CyclePrice price={tier.price} cycle={cycle} />}
          action={
            currentProductId === productId ? (
              <Button className="w-full" size="lg" variant="secondary" disabled>
                <CheckIcon />
                Your plan
              </Button>
            ) : currentProductId ? (
              <Link
                href={`/settings/subscription?plan=${productId}`}
                className={BUTTON}
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
              <Link href={loginUrl("signup", "/pricing")} className={BUTTON}>
                Sign up to subscribe
              </Link>
            )
          }
          features={aiFeatures(level)}
        />
        <PlanCard
          name={CREATOR_PLAN.name}
          tag="By application"
          description={CREATOR_PLAN.description}
          price={<Price amount={0} note="For creators we partner with" />}
          action={<CreatorContact />}
          features={CREATOR_PLAN.features}
        />
      </ul>
    </div>
  );
}

/** How much AI: each step of the slider is one of the paid tiers. */
function TokenSlider({
  level,
  onLevel,
}: {
  level: number;
  onLevel: (level: number) => void;
}) {
  const last = TIERS.length - 1;
  const tokens = TIERS[level]!.limits.aiTokens;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={last}
        step={1}
        value={level}
        onChange={(e) => onLevel(Number(e.target.value))}
        aria-label="AI tokens every month"
        aria-valuetext={`${tokens.toLocaleString("en-US")} AI tokens every month`}
        className={cn(styles.slider, "min-w-0 flex-1")}
        style={{ "--fill": `${(level / last) * 100}%` } as CSSProperties}
      />
      <span className="w-[4.5rem] shrink-0 text-right text-sm font-semibold text-accent-pink tabular-nums">
        {short(tokens)} tokens
      </span>
    </div>
  );
}

/** Creators pick how to reach us; channels without an address are hidden. */
function CreatorContact() {
  const channels = [
    { label: "Apply by email", href: creatorEmailHref(), external: false },
    CREATOR_CONTACT.instagram && {
      label: "Instagram",
      href: CREATOR_CONTACT.instagram,
      external: true,
    },
    CREATOR_CONTACT.form && {
      label: "Application form",
      href: CREATOR_CONTACT.form,
      external: true,
    },
  ].filter((channel) => !!channel);
  return (
    <div className="grid gap-2">
      {channels.map((channel) => (
        <a
          key={channel.label}
          href={channel.href}
          {...(channel.external && {
            target: "_blank",
            rel: "noopener noreferrer",
          })}
          className={BUTTON_SOFT}
        >
          {channel.label}
        </a>
      ))}
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 shrink-0", className)}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4.5 10.5 3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A paid plan's price for the cycle. Yearly strikes through twelve months at
 * the monthly price; switching to yearly cracks that price into the real one.
 */
function CyclePrice({
  price,
  cycle,
}: {
  price: Record<BillingCycle, number>;
  cycle: BillingCycle;
}) {
  const yearly = cycle === "year";
  const saving = savings(price);
  return (
    <Price
      amount={yearly ? price.year : price.month}
      mode={cycle}
      crackFrom={yearly ? price.month * 12 : undefined}
      period={yearly ? "/ year" : "/ month"}
      was={yearly ? money(price.month * 12) : undefined}
      saving={yearly ? saving : undefined}
      note={`Billed ${yearly ? "yearly" : "monthly"} · plus tax`}
    />
  );
}

function Price({
  amount,
  period,
  note,
  was,
  saving,
  mode,
  crackFrom,
}: {
  /** In cents. */
  amount: number;
  /** What the price is for, such as the billing cycle; see BreakingNumber. */
  mode?: string;
  crackFrom?: number;
  period?: string;
  note: string;
  /** The price before the yearly discount, struck through. */
  was?: string;
  saving?: number;
}) {
  return (
    <div aria-live="polite" aria-atomic="true">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <BreakingNumber value={amount} mode={mode} crackFrom={crackFrom} />
        {was && (
          <s className="text-base text-muted-foreground decoration-1">{was}</s>
        )}
        {period && (
          <Text as="span" tone="muted">
            {period}
          </Text>
        )}
      </div>
      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {saving ? (
          <span className="rounded-full bg-pastel-pink-soft px-2 py-0.5 font-semibold text-accent-pink">
            Save {saving}%
          </span>
        ) : null}
        <span>{note}</span>
      </div>
    </div>
  );
}

/**
 * The big price. When it drops, the old one cracks in two and falls away
 * while the new one drops in; when it rises, the new one just rises in. On a
 * change of mode, `crackFrom` is what cracks: the year at the monthly price.
 */
function BreakingNumber({
  value,
  mode,
  crackFrom,
}: {
  value: number;
  mode?: string;
  crackFrom?: number;
}) {
  const [shown, setShown] = useState({ value, mode });
  const [broken, setBroken] = useState<number | null>(null);
  const [moved, setMoved] = useState<"down" | "up" | null>(null);
  if (shown.value !== value || shown.mode !== mode) {
    const from =
      shown.mode !== mode && crackFrom !== undefined ? crackFrom : shown.value;
    setBroken(value < from ? from : null);
    setMoved(value < from ? "down" : "up");
    setShown({ value, mode });
  }
  return (
    <span className="relative inline-block font-display text-[40px] leading-none tracking-[0.02em]">
      <span
        key={`${shown.mode}-${shown.value}`}
        className={
          moved === "down" ? styles.enter : moved === "up" ? styles.rise : ""
        }
      >
        {money(shown.value)}
      </span>
      {broken !== null && (
        <span
          aria-hidden="true"
          className={styles.shards}
          onAnimationEnd={() => setBroken(null)}
        >
          <span className={styles.shardTop}>{money(broken)}</span>
          <span className={styles.shardBottom}>{money(broken)}</span>
        </span>
      )}
    </span>
  );
}

function PlanCard({
  name,
  tag,
  description,
  picker,
  price,
  action,
  features,
  highlighted,
}: {
  name: string;
  /** A short label beside the name, such as "No AI". */
  tag?: string;
  description: string;
  /** Shown instead of the description, such as the AI plan's slider. */
  picker?: ReactNode;
  price: ReactNode;
  action: ReactNode;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <li
      aria-label={`${name} plan${highlighted ? ", recommended" : ""}`}
      className={cn(
        styles.card,
        "min-w-0 rounded-3xl border bg-card p-6 shadow-[0_1px_2px_rgb(59_42_51/0.05)] transition-shadow hover:shadow-md",
        highlighted &&
          "border-primary/40 bg-linear-to-b from-pastel-pink-soft to-card shadow-[0_24px_60px_-28px_var(--color-primary)] ring-1 ring-primary/30 hover:shadow-[0_24px_60px_-24px_var(--color-primary)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Heading
          size="section"
          className={cn(highlighted && "text-accent-pink")}
        >
          {name}
        </Heading>
        {tag && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
              highlighted
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/75",
            )}
          >
            {tag}
          </span>
        )}
      </div>
      <div className="mt-1.5">
        {picker ?? (
          <Text tone="muted" className="leading-snug">
            {description}
          </Text>
        )}
      </div>
      <div className="mt-6">{price}</div>
      <div className="mt-6">{action}</div>
      <ul className="mt-6 space-y-2.5 border-t pt-6 text-[13px]">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5 leading-snug">
            <span className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full bg-pastel-pink-soft text-accent-pink">
              <CheckIcon className="size-3" />
            </span>
            <span>
              {feature}
              {UPCOMING_PERKS.has(feature) && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-px align-[1px] text-[10px] font-semibold text-muted-foreground">
                  Soon
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}
