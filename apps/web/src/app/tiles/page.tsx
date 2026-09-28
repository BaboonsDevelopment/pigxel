import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@pigxel/ui/components/button";
import { Brand } from "@/components/brand";
import { DraftCard } from "@/components/tiles/draft-card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Your tiles · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Tiles() {
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-5xl px-6">
      <header className="flex h-24 items-center justify-between border-b">
        <Brand />
        <Link
          href="/account"
          className="max-w-[50%] truncate rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          {user.email}
        </Link>
      </header>
      <section className="py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">Your tiles</h1>
          <Link href="/tiles/new" className={buttonClassName}>
            Create tile
          </Link>
        </div>
        <DraftCard userId={user.id} />
      </section>
    </main>
  );
}
