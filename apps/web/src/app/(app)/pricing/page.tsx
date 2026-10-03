import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Page } from "@pigxel/ui/components/page";
import { PageTransition } from "@/components/page-transition";
import { PricingPlans } from "@/components/pricing/pricing-plans";
import { getUser } from "@/lib/auth/session";
import { LEGAL } from "@/lib/legal";
import { countryFromHeaders, paddleClientConfig } from "@/lib/paddle/config";

export const metadata: Metadata = {
  title: "Pricing · Pigxel",
  description:
    "Pigxel is free to use. Paid plans add more AI generations and cloud storage.",
};

const FACTS: { text: string; href?: string }[] = [
  { text: "Cancel anytime" },
  { text: `Refunds within ${LEGAL.refundDays} days`, href: "/refunds" },
  { text: "Paddle handles payments and VAT" },
  { text: "Your art stays yours" },
];

const POLICIES = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export default async function Pricing() {
  const country = countryFromHeaders(await headers());
  const { environment, token } = paddleClientConfig();
  const user = await getUser();
  const customer = user?.email ? { id: user.id, email: user.email } : undefined;

  return (
    <PageTransition>
      <Page className="flex min-h-full max-w-6xl flex-col pt-6 pb-5 md:pt-6 lg:[@media(max-height:820px)]:pt-3 lg:[@media(max-height:740px)]:pb-3">
        <PricingPlans
          environment={environment}
          token={token}
          country={country}
          customer={customer}
          heading={
            <div>
              <h1 className="font-display text-4xl tracking-tight lg:text-5xl lg:[@media(max-height:820px)]:text-4xl">
                Pick your plan
              </h1>
              <p className="mt-2 text-muted-foreground lg:[@media(max-height:740px)]:hidden">
                Every drawing tool is free. Paid plans add more AI and more room
                for your art.
              </p>
            </div>
          }
        />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-4 text-[13px] text-muted-foreground lg:[@media(max-height:740px)]:mt-3 lg:[@media(max-height:740px)]:pt-3">
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
