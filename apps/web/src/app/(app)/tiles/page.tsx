import type { Metadata } from "next";
import Link from "next/link";
import { createButtonClass } from "@/components/app-shell/styles";
import { CloudTiles } from "@/components/tiles/cloud-tiles";
import { LocalTiles } from "@/components/tiles/local-tiles";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My projects · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Tiles() {
  const user = await requireUser();
  const cloudTiles = await listCloudTilesOnServer();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">My projects</h1>
          <Link href="/tiles/new" className={createButtonClass}>
            Create tile
          </Link>
        </div>
        <LocalTiles userId={user.id} hasCloudTiles={cloudTiles.length > 0} />
        <CloudTiles userId={user.id} tiles={cloudTiles} />
      </section>
    </main>
  );
}
