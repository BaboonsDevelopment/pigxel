import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Heading, Text } from "@pigxel/ui/components/typography";
import { PublicHeader } from "@/components/layout/public-header/public-header";
import { BrandMascot } from "@/components/ui/brand";
import { HOME_PATH } from "@/lib/auth/routes";
import { getUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Page not found · Pigxel",
  robots: { index: false },
};

export default async function NotFound() {
  const user = await getUser();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <PublicHeader signedIn={Boolean(user)} />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <BrandMascot
          priority
          className="h-auto w-40 [image-rendering:pixelated]"
        />
        <p
          aria-hidden="true"
          className="mt-6 font-display text-7xl font-semibold tracking-tight text-primary"
        >
          404
        </p>
        <Heading size="page" as="h1" className="mt-2">
          This page wandered off
        </Heading>
        <Text size="md" tone="muted" className="mt-3 max-w-md">
          The link may be broken, or the page was moved or deleted. Let’s get
          you back to drawing.
        </Text>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={user ? HOME_PATH : "/"}
            className={buttonVariants({ size: "lg" })}
          >
            {user ? "Go to Home" : "Go to Pigxel"}
          </Link>
          <Link
            href="/explore"
            className={buttonVariants({ size: "lg", variant: "secondary" })}
          >
            Explore art
          </Link>
        </div>
      </main>
    </div>
  );
}
