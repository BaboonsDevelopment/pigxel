import type { Metadata } from "next";
import { AssetLibrary } from "@/components/assets/asset-library";
import {
  ASSET_TABS,
  AssetTabs,
  type AssetTab,
} from "@/components/assets/asset-tabs";
import { PaletteList } from "@/components/assets/palette-list";
import { ScaledPage } from "@/components/scaled-page";

export const metadata: Metadata = { title: "Assets · Pigxel" };

type Props = { searchParams: Promise<{ type?: string }> };

/** Ready-made sprites, tiles and palettes to start a tile from or add to one. */
export default async function Assets({ searchParams }: Props) {
  const { type } = await searchParams;
  const tab: AssetTab =
    ASSET_TABS.find((t) => t.value === type)?.value ?? "all";

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
      {tab !== "palettes" && (
        <AssetLibrary only={tab === "all" ? undefined : tab} />
      )}
      {(tab === "all" || tab === "palettes") && <PaletteList />}
    </ScaledPage>
  );
}
