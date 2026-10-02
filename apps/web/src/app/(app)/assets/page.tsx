import type { Metadata } from "next";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import {
  AssetLibrary,
  type AssetSection,
} from "@/components/assets/asset-library";
import {
  ASSET_TABS,
  AssetTabs,
  type AssetTab,
} from "@/components/assets/asset-tabs";
import { ImportStarterSet } from "@/components/assets/import-starter-set";
import { PaletteList } from "@/components/assets/palette-list";
import { ScaledPage } from "@/components/scaled-page";
import { ASSET_CATEGORIES } from "@/lib/assets/assets";
import { listAssets } from "@/lib/assets/server";
import { isAdmin, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Assets · Pigxel" };
export const dynamic = "force-dynamic";

/** How many of each kind "All" shows before "See all". */
const PREVIEW = 12;
/** How many one kind's tab shows. */
const FULL = 240;

type Props = { searchParams: Promise<{ type?: string }> };

/**
 * Ready-made sprites, tiles and palettes to start a tile from or add to one.
 * Only the rows come from the database here; each card's picture is its
 * small sheet, cached by the browser.
 */
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
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sprites, seamless tiles and palettes to start a tile from or drop
            into yours.
          </p>
        </div>
        <AssetTabs active={tab} />
      </div>
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
