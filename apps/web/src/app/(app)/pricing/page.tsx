import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@pigxel/ui/components/page";
import { PageTransition } from "@/components/layout/page-transition";
import { PricingPlans } from "@/features/billing/components/pricing-plans";
import { getUser } from "@/lib/auth/session";
import { getCurrentPlan } from "@/features/billing/server";
import { LEGAL } from "@/features/legal/legal";
import { Heading, Text } from "@pigxel/ui/components/typography";

export const metadata: Metadata = {
  title: "Pricing · Pigxel",
  description:
    "Pigxel is free to use. Paid plans add the AI helper, more cloud storage, and premium assets and tutorials.",
};

const FACTS: { text: string; href?: string }[] = [
  { text: "Cancel anytime" },
  { text: `Refunds within ${LEGAL.refundDays} days`, href: "/refunds" },
  { text: "Creem handles payments and VAT" },
  { text: "Your art stays yours" },
];

const POLICIES = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export default async function Pricing({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const user = await getUser();
  const plan = user ? await getCurrentPlan(user.id) : null;
  const currentProductId =
    plan && plan.name !== "Free" ? plan.productId : undefined;

  return (
    <PageTransition>
      <Page className="flex min-h-full max-w-6xl flex-col pt-6 pb-5 md:pt-6 lg:[@media(max-height:820px)]:pt-3 lg:[@media(max-height:740px)]:pb-3">
        <PricingPlans
          signedIn={!!user}
          currentProductId={currentProductId}
          checkoutFailed={checkout === "error"}
          heading={
            <div>
              <Heading
                size="page"
                className="lg:text-5xl lg:[@media(max-height:820px)]:text-4xl"
              >
                Pick your plan
              </Heading>
              <Text
                size="md"
                tone="muted"
                className="mt-2 lg:[@media(max-height:740px)]:hidden"
              >
                Every drawing tool is free. Upgrade for more room, premium
                assets and the AI helper.
              </Text>
            </div>
          }
        />

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-4 text-[13px] text-muted-foreground lg:[@media(max-height:740px)]:mt-3 lg:[@media(max-height:740px)]:pt-3">
          <ul aria-label="Billing" className="contents">
            {FACTS.map((fact) => (
              <li key={fact.text} className="inline-flex items-center gap-1.5">
                <svg
                  className="size-3.5 shrink-0 text-primary"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m4 10 4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {fact.href ? (
                  <Link
                    href={fact.href}
                    className="hover:text-foreground hover:underline"
                  >
                    {fact.text}
                  </Link>
                ) : (
                  fact.text
                )}
              </li>
            ))}
          </ul>
          <nav aria-label="Policies" className="flex gap-x-4">
            {POLICIES.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Page>
    </PageTransition>
  );
}
