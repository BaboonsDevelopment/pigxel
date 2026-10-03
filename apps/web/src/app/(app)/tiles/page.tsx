import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { ScaledPage } from "@/components/scaled-page";
import { CloudTiles } from "@/components/tiles/cloud-tiles";
import { LocalTiles } from "@/components/tiles/local-tiles";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { requireUser } from "@/lib/auth/session";
import { PAGE_SIZE } from "./constants";
import { PageHeader } from "@pigxel/ui/components/typography";

export const metadata: Metadata = { title: "My projects · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Tiles() {
  const user = await requireUser();
  const cloudTiles = await listCloudTilesOnServer(user.id, PAGE_SIZE);
  return (
    <ScaledPage>
      <PageHeader
        title="My projects"
        actions={
          <Link href="/tiles/new" className={buttonVariants({ size: "lg" })}>
            Create tile
          </Link>
        }
      />
      <LocalTiles userId={user.id} hasCloudTiles={cloudTiles.length > 0} />
      <CloudTiles userId={user.id} initial={cloudTiles} />
    </ScaledPage>
  );
}
