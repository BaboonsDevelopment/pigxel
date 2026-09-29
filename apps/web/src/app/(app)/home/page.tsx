import type { Metadata } from "next";
import Link from "next/link";
import { createButtonClass } from "@/components/app-shell/styles";
import { CloudTiles } from "@/components/tiles/cloud-tiles";
import { LocalTiles } from "@/components/tiles/local-tiles";
import { profileOf, requireUser } from "@/lib/auth/session";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";

export const metadata: Metadata = { title: "Home · Pigxel" };
export const dynamic = "force-dynamic";

/** How many recent tiles each list shows on Home. */
const RECENT = 4;

export default async function Home() {
  const user = await requireUser();
  const cloudTiles = await listCloudTilesOnServer();
  const firstName = profileOf(user).name.split(" ")[0];
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <section className="flex flex-wrap items-end justify-between gap-6 rounded-2xl bg-[linear-gradient(120deg,#f8e3ec,#f3e6f6)] p-8">
        <div>
          <p className="text-sm text-[#8b7a84]">Welcome back,</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#3b2a33]">
            {firstName}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#6d5f67]">
            Pick up a tile where you left off, or start something new.
          </p>
        </div>
        <Link href="/tiles/new" className={createButtonClass}>
          Create tile
        </Link>
      </section>

      <div className="mt-2 flex items-center justify-end">
        <Link
          href="/tiles"
          className="mt-6 text-sm font-medium underline-offset-4 hover:underline"
        >
          See all projects →
        </Link>
      </div>
      <LocalTiles
        userId={user.id}
        hasCloudTiles={cloudTiles.length > 0}
        limit={RECENT}
      />
      <CloudTiles userId={user.id} tiles={cloudTiles} limit={RECENT} />
    </main>
  );
}
