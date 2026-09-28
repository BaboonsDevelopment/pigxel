import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { requireUser } from "@/lib/auth/session";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Your account · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const { updated } = await searchParams;
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="border-b pb-6">
        <Brand />
      </header>
      <section className="py-16">
        {updated === "password" && (
          <p
            role="status"
            className="mb-6 rounded-lg border bg-muted p-3 text-sm"
          >
            Your password has been updated.
          </p>
        )}
        <p className="mb-3 text-sm text-muted-foreground">You’re signed in</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to Pigxel.
        </h1>
        <p className="mt-4 break-words text-muted-foreground">{user.email}</p>
        <p className="mt-6 mb-8 text-sm leading-relaxed text-muted-foreground">
          Your account is ready.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <SignOutButton />
          <Link href="/tiles" className="text-sm underline underline-offset-4">
            Your tiles
          </Link>
          <Link
            href="/auth/update-password"
            className="text-sm underline underline-offset-4"
          >
            Change password
          </Link>
        </div>
      </section>
    </main>
  );
}
