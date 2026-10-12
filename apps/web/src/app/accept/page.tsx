import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heading, Text } from "@pigxel/ui/components/typography";
import { BrandMascot } from "@/components/ui/brand";
import { AcceptForm } from "@/features/legal/components/accept-form";
import {
  hasAcceptedLegal,
  LEGAL,
  LEGAL_CHANGES,
  legalDate,
} from "@/features/legal/legal";
import { SignOutButton } from "@/features/settings/account/sign-out-button";
import { getUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Before you continue · Pigxel",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function Accept({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next: rawNext }, user] = await Promise.all([
    searchParams,
    getUser(),
  ]);
  const next = safeNext(rawNext);
  if (!user) redirect("/login");
  if (hasAcceptedLegal(user.user_metadata)) redirect(next);
  // People who joined before this version are told what changed.
  const returning =
    new Date(user.created_at) < new Date(`${LEGAL.updated}T00:00:00Z`);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-md">
        <BrandMascot
          priority
          className="mx-auto h-auto w-24 [image-rendering:pixelated]"
        />
        <Heading size="page" as="h1" className="mt-6 text-center">
          {returning ? "We’ve updated our terms" : "Before you continue"}
        </Heading>
        <Text tone="muted" className="mt-3 text-center">
          {returning ? (
            <>
              Our Terms of Service and Privacy Policy changed on{" "}
              {legalDate(LEGAL.updated)}. {LEGAL_CHANGES}
            </>
          ) : (
            <>
              Pigxel is for people {LEGAL.minAge} and older. Please confirm and
              agree to our terms to start drawing.
            </>
          )}
        </Text>
        <div className="mt-8 rounded-2xl border bg-card p-6">
          <AcceptForm next={next} />
        </div>
        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <SignOutButton />
          <p className="text-center">
            Don’t agree? You can{" "}
            <Link
              href="/settings/account#delete-account"
              className="underline underline-offset-2 hover:text-foreground"
            >
              download your data and delete your account
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
