import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { PricingPlans } from "@/components/pricing/pricing-plans";
import { LEGAL } from "@/lib/legal";
import { countryFromHeaders, paddleClientConfig } from "@/lib/paddle/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing · Pigxel",
  description:
    "Pigxel is free to use. Paid plans add more AI generations and cloud storage.",
};

/** The signed-in person, if any, so checkout can prefill their email. */
async function signedInCustomer() {
  if (!isSupabaseConfigured()) return undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ? { id: user.id, email: user.email } : undefined;
}

/** The plans side by side, then answers to common billing questions. */
export default async function Pricing() {
  // Headers first: the page renders per request, so the config is checked
  // when it's served rather than at build time.
  const country = countryFromHeaders(await headers());
  const { environment, token } = paddleClientConfig();
  const customer = await signedInCustomer();

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

      <PricingPlans
        environment={environment}
        token={token}
        country={country}
        customer={customer}
      />

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
