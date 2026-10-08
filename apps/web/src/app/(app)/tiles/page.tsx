import type { Metadata } from "next";
import { Page } from "@pigxel/ui/components/page";
import { ProjectsView } from "@/features/tiles/components/projects-view/projects-view";
import { listFolders, listLabels } from "@/features/tiles/server";
import { listSavedArts } from "@/features/explore/server";
import { listCloudTilesOnServer } from "@/lib/pigxel-file/cloud-server";
import { requireUser } from "@/lib/auth/session";
import { PAGE_SIZE } from "@/features/tiles/constants";

export const metadata: Metadata = { title: "My projects · Pigxel" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ folder?: string }> };

export default async function Tiles({ searchParams }: Props) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [folders, saved, labels] = await Promise.all([
    listFolders(user.id).catch((error: unknown) => {
      console.error(error);
      return [];
    }),
    listSavedArts(user.id).catch((error: unknown) => {
      console.error(error);
      return [];
    }),
    listLabels(user.id).catch((error: unknown) => {
      console.error(error);
      return [];
    }),
  ]);
  const folder = folders.find((f) => f.id === params.folder) ?? null;
  const cloudTiles = await listCloudTilesOnServer(
    user.id,
    PAGE_SIZE,
    0,
    folder?.id ?? null,
  );
  return (
    <div className="min-h-full bg-[url(/art/background-effect.png)] bg-top bg-repeat">
      <Page className="max-w-[100rem] px-5 pt-3 pb-12 md:px-8 md:pt-2 xl:px-10">
        <ProjectsView
          key={folder?.id ?? "all"}
          userId={user.id}
          initial={cloudTiles}
          folders={folders}
          folder={folder}
          saved={saved}
          labels={labels}
        />
      </Page>
    </div>
  );
}
