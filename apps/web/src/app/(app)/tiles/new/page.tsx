import type { Metadata } from "next";
import { Page } from "@pigxel/ui/components/page";
import { PageTitle } from "@pigxel/ui/components/typography";
import { NewTileForm } from "@/features/tiles/components/new-tile-form";
import { findAsset } from "@/features/assets/server";
import { requireUser } from "@/lib/auth/session";
import { listFolders } from "@/features/tiles/server";
import { getDriveStatus } from "@/lib/google-drive/server";
import { readPalette } from "@/lib/palette/presets";

export const metadata: Metadata = { title: "New tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function NewTile({
  searchParams,
}: {
  searchParams: Promise<{
    drive?: string;
    asset?: string;
    palette?: string;
    colors?: string;
    paletteName?: string;
    from?: string;
    folder?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const colors = readPalette(
    params.colors?.split(",").map((color) => `#${color}`) ?? [],
  );
  const [drive, asset, folders] = await Promise.all([
    getDriveStatus(user.id),
    findAsset(params.asset),
    params.folder ? listFolders(user.id).catch(() => []) : [],
  ]);
  const folder = folders.find((f) => f.id === params.folder);
  return (
    <Page>
      <PageTitle className="mb-8">New tile</PageTitle>
      <NewTileForm
        userId={user.id}
        drive={drive}
        driveError={params.drive === "error"}
        asset={asset}
        paletteId={params.palette}
        customPalette={
          colors?.length
            ? {
                id: "custom",
                name: params.paletteName?.slice(0, 100) || "Custom palette",
                colors,
              }
            : null
        }
        from={params.from}
        folder={folder && { id: folder.id, name: folder.name }}
      />
    </Page>
  );
}
