import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Page } from "@pigxel/ui/components/page";
import { Lead, PageTitle } from "@pigxel/ui/components/typography";
import { CloudTiles } from "@/components/tiles/cloud-tiles";
import { LocalTiles } from "@/components/tiles/local-tiles";
import { requireUser } from "@/lib/auth/session";
import { sidebarProfile } from "@/lib/profile/server";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";

export const metadata: Metadata = { title: "Home · Pigxel" };
export const dynamic = "force-dynamic";

/** How many recent tiles each list shows on Home. */
const RECENT = 4;

export default async function Home() {
  const user = await requireUser();
  const [cloudTiles, profile] = await Promise.all([
    listCloudTilesOnServer(RECENT),
    sidebarProfile(user),
  ]);
  const firstName = profile.name.split(" ")[0];
  return (
    <Page>
      <section className="flex flex-wrap items-end justify-between gap-6 rounded-2xl bg-linear-120 from-[#f8e3ec] to-[#f3e6f6] p-8">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <PageTitle className="mt-1">{firstName}</PageTitle>
          <Lead className="mt-3 max-w-md">
            Pick up a tile where you left off, or start something new.
          </Lead>
        </div>
        <Link href="/tiles/new" className={buttonVariants({ size: "lg" })}>
          Create tile
        </Link>
      </section>

      <div className="mt-6 flex items-center justify-end">
        <Link
          href="/tiles"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
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
    </Page>
  );
}
