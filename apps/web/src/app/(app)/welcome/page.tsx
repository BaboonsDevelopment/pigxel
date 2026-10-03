import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Page } from "@pigxel/ui/components/page";
import { PageTransition } from "@/components/page-transition";
import { Heading, Text } from "@pigxel/ui/components/typography";

export const metadata: Metadata = {
  title: "Welcome · Pigxel",
  robots: { index: false },
};

export default function Welcome() {
  return (
    <PageTransition>
      <Page width="narrow" className="py-24 text-center md:pt-24">
        <Heading size="page" className="sm:text-5xl">
          Thanks for subscribing
        </Heading>
        <Text size="md" tone="muted" className="mt-4">
          Your payment went through, and Paddle is emailing your receipt.
        </Text>
        <Link
          href="/home"
          className={buttonVariants({ size: "lg", className: "mt-8" })}
        >
          Start creating
        </Link>
      </Page>
    </PageTransition>
  );
}
