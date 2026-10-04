import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Page } from "@pigxel/ui/components/page";
import { PageTransition } from "@/components/layout/page-transition";
import { Heading, Text } from "@pigxel/ui/components/typography";
import { getUser } from "@/lib/auth/session";
import { getCurrentPlan } from "@/features/billing/server";
import { AwaitingPlan } from "@/features/billing/components/awaiting-plan";

export const metadata: Metadata = {
  title: "Welcome · Pigxel",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function Welcome() {
  const user = await getUser();
  const plan = user ? await getCurrentPlan(user.id) : null;
  const paid = plan && plan.name !== "Free" ? plan : null;
  return (
    <PageTransition>
      <Page width="narrow" className="py-24 text-center md:pt-24">
        <Heading size="page" className="sm:text-5xl">
          {paid ? `Welcome to ${paid.name}` : "Thanks for subscribing"}
        </Heading>
        {paid ? (
          <Text size="md" tone="muted" className="mt-4">
            Your plan is active, and Paddle is emailing your receipt.
          </Text>
        ) : user ? (
          <AwaitingPlan />
        ) : (
          <Text size="md" tone="muted" className="mt-4">
            Log in to see your plan in Settings → Subscription.
          </Text>
        )}
        <Link
          href={paid ? "/home" : "/settings/subscription"}
          className={buttonVariants({ size: "lg", className: "mt-8" })}
        >
          {paid ? "Start creating" : "View my plan"}
        </Link>
      </Page>
    </PageTransition>
  );
}
