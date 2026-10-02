import type { Metadata } from "next";
import { Page } from "@pigxel/ui/components/page";
import { PageTitle } from "@pigxel/ui/components/typography";
import { NewTileForm } from "@/components/tiles/new-tile-form";
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
  const [params, drive] = await Promise.all([
    searchParams,
    getDriveStatus(user.id),
  ]);
  return (
    <Page>
      <PageTitle className="mb-8">New tile</PageTitle>
      <NewTileForm
        userId={user.id}
        drive={drive}
        driveError={params.drive === "error"}
        assetId={params.asset}
        paletteId={params.palette}
        from={params.from}
      />
    </Page>
  );
}
