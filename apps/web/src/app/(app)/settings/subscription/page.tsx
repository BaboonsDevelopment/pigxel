import type { Metadata } from "next";
import { Card } from "@pigxel/ui/components/card";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Subscription · Pigxel" };
export const dynamic = "force-dynamic";

/** Billing through Paddle comes next; everyone is on Free until then. */
export default async function SubscriptionSettings() {
  await requireUser();
  return (
    <section aria-labelledby="plan-heading">
      <SectionTitle id="plan-heading">Your plan</SectionTitle>
      <Card className="mt-4">
        <p className="text-sm text-muted-foreground">Current plan</p>
        <p className="mt-1 text-2xl font-semibold">Free</p>
        <Lead className="mt-3">
          Plus, Pro and Ultimate plans are coming soon. When they arrive, you’ll
          upgrade, change your payment method and see invoices here.
        </Lead>
      </Card>
    </section>
  );
}
