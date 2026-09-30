import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import { LEGAL } from "@/lib/legal";
import { PLANS, type Plan } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing · Pigxel",
  description:
    "Pigxel is free to use. Paid plans add more AI generations and cloud storage.",
};

/** The plans side by side, then answers to common billing questions. */
export default function Pricing() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          Pick your plan
        </h1>
        <p className="mt-3 text-muted-foreground">
          Every drawing tool is free. Paid plans add more AI and more room for
          your art. Cancel anytime.
        </p>
      </div>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <li key={plan.id}>
            <PlanCard plan={plan} />
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="faq-heading"
        className="mx-auto mt-20 max-w-3xl"
      >
        <h2 id="faq-heading" className="font-display text-2xl tracking-tight">
          Questions
        </h2>
        <dl className="mt-6 space-y-6 text-[15px] leading-relaxed">
          <Question title="Can I cancel anytime?">
            Yes. Cancel from Settings › Subscription and your plan stays until
            the end of the period you paid for. It doesn’t renew after that.
          </Question>
          <Question title="Can I get a refund?">
            Yes, within {LEGAL.refundDays} days of a payment, no questions
            asked. See the{" "}
            <Link href="/refunds" className="text-primary underline">
              Refund Policy
            </Link>
            .
          </Question>
          <Question title="Who handles payments?">
            Our reseller Paddle.com is the Merchant of Record for all orders.
            Paddle takes the payment, handles taxes like VAT, and appears on
            your statement.
          </Question>
          <Question title="What happens to my art if I stop paying?">
            It stays yours. You keep every tile and can still open, edit and
            export it on the Free plan.
          </Question>
        </dl>
      </section>
    </main>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const free = plan.monthly === 0;
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-card p-6",
        plan.highlighted &&
          "border-primary shadow-[0_18px_40px_-24px_var(--color-primary)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl">{plan.name}</h2>
        {plan.highlighted && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
            Most popular
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
      <p className="mt-5 flex items-baseline gap-1">
        {plan.monthly === null ? (
          <span className="font-display text-2xl text-muted-foreground">
            Coming soon
          </span>
        ) : (
          <>
            <span className="font-display text-4xl tracking-tight">
              ${plan.monthly}
            </span>
            <span className="text-sm text-muted-foreground">
              {free ? "forever" : "/ month"}
            </span>
          </>
        )}
      </p>
      <ul className="mt-6 flex-1 space-y-2 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden="true" className="text-primary">
              ✦
            </span>
            {feature}
          </li>
        ))}
      </ul>
      {free ? (
        <Link
          href="/login?mode=signup"
          className={buttonVariants({ className: "mt-6 w-full" })}
        >
          Start for free
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={buttonVariants({
            variant: "secondary",
            className: "mt-6 w-full",
          })}
        >
          Coming soon
        </span>
      )}
    </article>
  );
}

function Question({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-semibold">{title}</dt>
      <dd className="mt-1 text-muted-foreground">{children}</dd>
    </div>
  );
}
