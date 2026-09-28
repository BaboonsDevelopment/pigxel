import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function NewTile() {
  await requireUser();
  return (
    <main className="mx-auto max-w-5xl px-6">
      <header className="flex h-24 items-center border-b">
        <Brand />
      </header>
      <section className="py-12">
        <h1 className="text-3xl font-semibold tracking-tight">New tile</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The tile editor is coming next.
        </p>
        <Link
          href="/tiles"
          className="mt-8 inline-block text-sm underline underline-offset-4"
        >
          Back to your tiles
        </Link>
      </section>
    </main>
  );
}
