import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { ScaledPage } from "@/components/scaled-page";
import { CloudTiles } from "@/components/tiles/cloud-tiles";
import { LocalTiles } from "@/components/tiles/local-tiles";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { requireUser } from "@/lib/auth/session";
import { PAGE_SIZE } from "./constants";

export const metadata: Metadata = { title: "My projects · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Tiles() {
  const user = await requireUser();
  const cloudTiles = await listCloudTilesOnServer(user.id, PAGE_SIZE);
  return (
    <ScaledPage>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h1 className="font-display text-4xl tracking-tight">My projects</h1>
        <Link href="/tiles/new" className={buttonVariants({ size: "lg" })}>
          Create tile
        </Link>
      </div>
      <LocalTiles userId={user.id} hasCloudTiles={cloudTiles.length > 0} />
      <CloudTiles userId={user.id} initial={cloudTiles} />
    </ScaledPage>
  );
}
