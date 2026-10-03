import type { Metadata } from "next";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { PageHeader } from "@pigxel/ui/components/typography";
import {
  AssetLibrary,
  type AssetSection,
} from "@/features/assets/components/asset-library";
import {
  ASSET_TABS,
  AssetTabs,
  type AssetTab,
} from "@/features/assets/components/asset-tabs";
import { ImportStarterSet } from "@/features/assets/components/import-starter-set";
import { PaletteList } from "@/features/assets/components/palette-list";
import { ScaledPage } from "@/components/layout/scaled-page";
import { ASSET_CATEGORIES } from "@/features/assets/assets";
import { listAssets } from "@/features/assets/server";
import { isAdmin, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Assets · Pigxel" };
export const dynamic = "force-dynamic";

const PREVIEW = 12;
const FULL = 240;

type Props = { searchParams: Promise<{ type?: string }> };

export default async function Assets({ searchParams }: Props) {
  const [{ type }, user] = await Promise.all([searchParams, requireUser()]);
  const tab: AssetTab =
    ASSET_TABS.find((t) => t.value === type)?.value ?? "all";
  const admin = isAdmin(user);

  const categories = ASSET_CATEGORIES.filter(
    (c) => tab === "all" || c.id === tab,
  );
  const sections: AssetSection[] =
    tab === "palettes"
      ? []
      : await Promise.all(
          categories.map(async (category) => ({
            category,
            ...(await listAssets(category.id, tab === "all" ? PREVIEW : FULL)),
          })),
        );
  const empty = tab !== "palettes" && sections.every((s) => s.total === 0);

  return (
    <ScaledPage>
      <PageHeader
        title="Assets"
        description="Sprites, seamless tiles and palettes to start a tile from or drop into yours."
        actions={<AssetTabs active={tab} />}
      />
      {empty ? (
        <EmptyState
          className="mt-12"
          title={tab === "all" ? "No assets yet" : "Nothing here yet"}
          description={
            admin
              ? "Publish a tile from the editor (File › Publish to Assets…), or start with the starter set."
              : "The Pigxel team is drawing them. Check back soon."
          }
          action={admin && tab === "all" ? <ImportStarterSet /> : undefined}
        />
      ) : (
        <AssetLibrary sections={sections} canManage={admin} />
      )}
      {(tab === "all" || tab === "palettes") && <PaletteList />}
    </ScaledPage>
  );
}
