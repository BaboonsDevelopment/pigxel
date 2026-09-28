import type { Metadata } from "next";
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
    <main className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <section>
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
