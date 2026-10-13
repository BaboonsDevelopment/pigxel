import type { Metadata } from "next";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { Notice } from "@pigxel/ui/components/notice";
import { PageHeader } from "@pigxel/ui/components/typography";
import {
  AssetLibrary,
  type AssetSection,
} from "@/features/assets/components/asset-library";
import {
  ALL_TAB,
  AssetTabs,
  PALETTES_TAB,
} from "@/features/assets/components/asset-tabs";
import { ImportStarterSet } from "@/features/assets/components/import-starter-set";
import { PaletteList } from "@/features/assets/components/palette-list";
import { ScaledPage } from "@/components/layout/scaled-page";
import {
  countPremiumAssets,
  listAssetBlocks,
  listAssets,
} from "@/features/assets/server";
import { isAdmin, requireUser } from "@/lib/auth/session";
import { shownFrom } from "@/lib/utils/shown";

export const metadata: Metadata = { title: "Assets · Pigxel" };
export const dynamic = "force-dynamic";

const PREVIEW = 12;
const STEP = 240;

type Props = { searchParams: Promise<{ type?: string; shown?: string }> };

export default async function Assets({ searchParams }: Props) {
  const [{ type, shown: shownParam }, user] = await Promise.all([
    searchParams,
    requireUser(),
  ]);
  const blocks = await listAssetBlocks().catch((error: unknown) => {
    console.error(error);
    return null;
  });
  const filled = (blocks ?? []).filter((block) => block.count > 0);
  const tab =
    type === PALETTES_TAB || filled.some((block) => block.id === type)
      ? type!
      : ALL_TAB;
  const admin = isAdmin(user);
  const premiumMissing =
    admin && tab === ALL_TAB && (await countPremiumAssets()) === 0;

  const shown = tab === ALL_TAB ? PREVIEW : shownFrom(shownParam, STEP);
  const sections: AssetSection[] | null =
    tab === PALETTES_TAB
      ? []
      : !blocks
        ? null
        : await Promise.all(
            blocks.flatMap((category, index) =>
              tab === ALL_TAB || category.id === tab
                ? [
                    listAssets(category.id, shown).then((list) => ({
                      category,
                      index,
                      ...list,
                      more:
                        tab !== ALL_TAB && list.total > list.assets.length
                          ? `/assets?type=${category.id}&shown=${shown + STEP}`
                          : undefined,
                    })),
                  ]
                : [],
            ),
          ).catch((error: unknown) => {
            console.error(error);
            return null;
          });
  const empty =
    tab !== PALETTES_TAB && !!sections && sections.every((s) => s.total === 0);

  return (
    <ScaledPage>
      <PageHeader
        title="Assets"
        description="Sprites, seamless tiles and palettes to start a tile from or drop into yours."
        actions={<AssetTabs blocks={filled} active={tab} />}
      />
      {premiumMissing && sections && !empty && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4">
          <span className="text-sm text-muted-foreground">
            Admin: no premium assets yet. Publish the premium set (knight,
            wizard, torch, shield, crystals, lava) for paid plans.
          </span>
          <ImportStarterSet premium />
        </div>
      )}
      {!sections ? (
        <Notice tone="error" className="mt-8">
          Couldn’t load assets. Refresh the page to try again.
        </Notice>
      ) : empty ? (
        <EmptyState
          className="mt-12"
          title={tab === ALL_TAB ? "No assets yet" : "Nothing here yet"}
          description={
            admin
              ? "Publish a tile from the editor (File › Publish to Assets…), or start with the starter set."
              : "The Pigxel team is drawing them. Check back soon."
          }
          action={admin && tab === ALL_TAB ? <ImportStarterSet /> : undefined}
        />
      ) : (
        <AssetLibrary sections={sections} canManage={admin} />
      )}
      {(tab === ALL_TAB || tab === PALETTES_TAB) && <PaletteList />}
    </ScaledPage>
  );
}
