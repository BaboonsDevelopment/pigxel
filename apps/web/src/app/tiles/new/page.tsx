import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { NewTileForm } from "@/components/tiles/new-tile-form";
import { requireUser } from "@/lib/auth/session";
import { getDriveStatus } from "@/lib/google-drive/server";

export const metadata: Metadata = { title: "New tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function NewTile({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string }>;
}) {
  const user = await requireUser();
  const [params, drive] = await Promise.all([
    searchParams,
    getDriveStatus(user.id),
  ]);
  return (
    <main className="mx-auto max-w-5xl px-6">
      <header className="flex h-24 items-center justify-between border-b">
        <Brand />
        <Link
          href="/tiles"
          className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          Your tiles
        </Link>
      </header>
      <section className="py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">New tile</h1>
        <NewTileForm
          userId={user.id}
          drive={drive}
          driveError={params.drive === "error"}
        />
      </section>
    </main>
  );
}
