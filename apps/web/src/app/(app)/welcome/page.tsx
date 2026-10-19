import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Page } from "@pigxel/ui/components/page";
import { PageTransition } from "@/components/layout/page-transition";
import { Heading, Text } from "@pigxel/ui/components/typography";
import { getUser } from "@/lib/auth/session";
import { getCurrentPlan } from "@/features/billing/server";
import { AwaitingPlan } from "@/features/billing/components/awaiting-plan";
import mascot from "../../../../public/art/pigxel-mascot-sitting.png";

export const metadata: Metadata = {
  title: "Thank you for purchasing · Pigxel",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function Welcome({
  searchParams,
}: {
  searchParams?: Promise<{ checkout_id?: string | string[] }>;
} = {}) {
  const params = await searchParams;
  const checkoutId =
    typeof params?.checkout_id === "string" ? params.checkout_id : undefined;
  const user = await getUser();
  const plan = user ? await getCurrentPlan(user.id) : null;
  const paid = plan && plan.name !== "Free" ? plan : null;
  return (
    <PageTransition>
      <Page
        width="narrow"
        className="flex min-h-full flex-col items-center justify-center py-12 text-center md:py-16"
      >
        <div className="relative mb-8 flex size-52 items-center justify-center sm:size-64">
          <div
            aria-hidden="true"
            className="absolute inset-2 rounded-full bg-primary/10"
          />
          <Image
            src={mascot}
            alt="Pigxel’s smiling pig mascot"
            priority
            sizes="(min-width: 640px) 256px, 208px"
            className="relative h-auto w-full"
          />
        </div>
        <div className="max-w-lg">
          <Heading size="page" className="text-balance sm:text-5xl">
            Thank you for purchasing!
          </Heading>
          <Text size="md" tone="muted" className="mt-4 leading-relaxed">
            You’re helping Pigxel grow. We can’t wait to see what you create.
          </Text>
          {paid ? (
            <Text tone="muted" className="mt-4 leading-relaxed">
              Your {paid.name} plan is active. Creem will email your receipt.
            </Text>
          ) : user ? (
            <AwaitingPlan checkoutId={checkoutId} />
          ) : (
            <Text tone="muted" className="mt-4 leading-relaxed">
              Log in to see your plan in Settings → Subscription.
            </Text>
          )}
          <Link
            href="/home"
            className={buttonVariants({
              size: "lg",
              className: "mt-8 w-full sm:w-auto",
            })}
          >
            Go back to Pigxel
          </Link>
        </div>
      </Page>
    </PageTransition>
  );
}
