import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@pigxel/ui/components/typography";
import { ScaledPage } from "@/components/layout/scaled-page";
import { AdminPackAssets } from "@/features/assets/components/admin/admin-pack-assets";
import { isLocalAdmin } from "@/features/assets/local-admin";
import {
  listAssets,
  listAssetTags,
  listPackCards,
} from "@/features/assets/server";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pack admin · Pigxel",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PackAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isLocalAdmin()) notFound();
  const [{ id }] = await Promise.all([params, requireUser()]);
  const pack = (await listPackCards()).find((p) => p.id === id);
  if (!pack) notFound();
  const [{ assets }, tags] = await Promise.all([
    listAssets(pack.id, 1000),
    listAssetTags(),
  ]);
  return (
    <ScaledPage>
      <PageHeader
        title={pack.name}
        description={pack.id}
        actions={
          <Link
            href="/internal/admin"
            className="text-sm text-link-accent hover:underline"
          >
            All packs
          </Link>
        }
      />
      <div className="mt-6">
        <AdminPackAssets pack={pack} assets={assets} tags={tags} />
      </div>
    </ScaledPage>
  );
}
