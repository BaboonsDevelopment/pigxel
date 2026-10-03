import type { Metadata } from "next";
import { Page } from "@pigxel/ui/components/page";
import { PageTitle } from "@pigxel/ui/components/typography";
import { NewTileForm } from "@/features/tiles/components/new-tile-form";
import { findAsset } from "@/features/assets/server";
import { requireUser } from "@/lib/auth/session";
import { getDriveStatus } from "@/lib/google-drive/server";

export const metadata: Metadata = { title: "New tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function NewTile({
  searchParams,
}: {
  searchParams: Promise<{
    drive?: string;
    asset?: string;
    palette?: string;
    from?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [drive, asset] = await Promise.all([
    getDriveStatus(user.id),
    findAsset(params.asset),
  ]);
  return (
    <Page>
      <PageTitle className="mb-8">New tile</PageTitle>
      <NewTileForm
        userId={user.id}
        drive={drive}
        driveError={params.drive === "error"}
        asset={asset}
        paletteId={params.palette}
        from={params.from}
      />
    </Page>
  );
}
