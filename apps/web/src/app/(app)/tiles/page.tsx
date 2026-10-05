import type { Metadata } from "next";
import { Page } from "@pigxel/ui/components/page";
import { ProjectsView } from "@/features/tiles/components/projects-view/projects-view";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { requireUser } from "@/lib/auth/session";
import { PAGE_SIZE } from "@/features/tiles/constants";

export const metadata: Metadata = { title: "My projects · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Tiles() {
  const user = await requireUser();
  const cloudTiles = await listCloudTilesOnServer(user.id, PAGE_SIZE);
  return (
    <div className="min-h-full bg-[url(/art/background-effect.png)] bg-top bg-repeat">
      <Page className="max-w-[100rem] px-5 pt-3 pb-12 md:px-8 md:pt-2 xl:px-10">
        <ProjectsView userId={user.id} initial={cloudTiles} />
      </Page>
    </div>
  );
}
