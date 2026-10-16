import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@pigxel/ui/components/notice";
import { PageHeader } from "@pigxel/ui/components/typography";
import { ScaledPage } from "@/components/layout/scaled-page";
import { AdminPackList } from "@/features/assets/components/admin/admin-pack-list";
import { isLocalAdmin } from "@/features/assets/local-admin";
import { listPackCards } from "@/features/assets/server";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Asset admin · Pigxel",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Local-only: the hosted site answers 404 here (see isLocalAdmin). */
export default async function AssetAdminPage() {
  if (!isLocalAdmin()) notFound();
  await requireUser();
  const packs = await listPackCards();
  return (
    <ScaledPage>
      <PageHeader
        title="Asset admin"
        description="Only on your machine (pnpm dev). Changes go to the live database."
        actions={
          <Link
            href="/assets"
            className="text-sm text-link-accent hover:underline"
          >
            Open the Assets page
          </Link>
        }
      />
      <Notice className="mt-6 mb-6">
        Edit a pack’s name, description, colour and premium here; open its
        assets to tag them, choose which lead the collage, or remove them.
      </Notice>
      <AdminPackList packs={packs} />
    </ScaledPage>
  );
}
