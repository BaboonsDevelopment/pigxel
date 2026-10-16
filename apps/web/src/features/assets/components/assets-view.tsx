"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { SectionHeader } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { madimiOne } from "@/lib/fonts/madimi";
import mascot from "../../../../public/art/pigxel-mascot-studying.png";
import type { Asset } from "../assets";
import { assetTint } from "../constants";
import {
  ASSET_TABS,
  assetViewUrl,
  filterPacks,
  NO_ASSET_FILTERS,
  packViewUrl,
  type AssetFilters,
  type AssetTab,
} from "../filters";
import type { AssetTag, PackCard as Pack } from "../server";
import {
  ASSET_GRID,
  AssetCardItem,
  AssetResults,
  AssetToolbar,
  useAssetFilters,
  useFavourites,
  type AssetPage,
} from "./asset-browser";
import { AssetDialog } from "./asset-dialog";
import { PackCard } from "./pack-card";
import { PaletteList } from "./palette-list";

export function AssetsView({
  tab: initialTab,
  filters: initialFilters,
  packs,
  tags,
  favourites: initialFavourites,
  recent,
  firstPage,
  openAsset,
}: {
  tab: AssetTab;
  filters: AssetFilters;
  packs: Pack[];
  tags: AssetTag[];
  favourites: { assets: string[]; packs: string[] };
  recent: Asset[];
  /** All assets for the filters in the address, when that tab is open. */
  firstPage: AssetPage | null;
  /** The asset in the address (?asset=…), opened in its dialog. */
  openAsset: Asset | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const { filters, typed, setTyped, setFilters, reset } =
    useAssetFilters(initialFilters);
  const [open, setOpen] = useState<Asset | null>(openAsset);
  const favourites = useFavourites(initialFavourites);

  const packById = useMemo(
    () => new Map(packs.map((pack, index) => [pack.id, { pack, index }])),
    [packs],
  );
  const tagNames = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.name])),
    [tags],
  );

  // The address follows the view, so it can be shared and reloaded.
  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      assetViewUrl(tab, filters, open?.id ?? null),
    );
  }, [tab, filters, open]);

  const shownPacks = useMemo(
    () =>
      filterPacks(packs, filters, {
        favourites: favourites.packs,
        tagNames,
      }),
    [packs, filters, favourites.packs, tagNames],
  );

  const showTag = (tagId: string) => {
    setTab("all");
    reset({ ...NO_ASSET_FILTERS, tags: [tagId], sort: filters.sort });
  };

  const filtered =
    JSON.stringify({ ...filters, sort: "" }) !==
    JSON.stringify({ ...NO_ASSET_FILTERS, sort: "" });

  return (
    <div>
      <header className="relative mb-8 border-b border-[#f0dde5] pb-4 md:pt-4">
        <h1
          className={cn(
            madimiOne.className,
            "text-[48px] leading-[63px] tracking-[0.03em] text-[#4a2434]",
          )}
        >
          Assets
        </h1>
        <div
          role="tablist"
          aria-label="View"
          className="mt-2 inline-flex rounded-xl border border-[#e7c6d2] bg-background p-1"
        >
          {ASSET_TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={tab === option.value}
              onClick={() => setTab(option.value)}
              className="h-8 cursor-pointer rounded-lg px-4 text-sm text-[#4a1f35] transition-colors hover:bg-muted aria-selected:bg-[#fde2ea] aria-selected:font-semibold"
            >
              {option.label}
            </button>
          ))}
        </div>
        {tab !== "palettes" && (
          <div className="mt-3 lg:pr-[310px]">
            <AssetToolbar
              key={tab}
              typed={typed}
              onTyped={setTyped}
              placeholder={
                tab === "packs"
                  ? "Search packs, tags or ids…"
                  : "Search assets, packs, tags or ids…"
              }
              filters={filters}
              onFilters={setFilters}
              tags={tags}
              packs={packs}
              kind={tab === "all"}
              pack={tab === "all"}
            />
          </div>
        )}
        <Image
          src={mascot}
          alt=""
          width={237}
          height={158}
          priority
          className="pointer-events-none absolute right-12 bottom-0 hidden h-auto w-[250px] translate-y-[9%] lg:block"
        />
      </header>

      {favourites.error && (
        <FormMessage tone="error" className="mb-4">
          {favourites.error}
        </FormMessage>
      )}

      {tab === "palettes" && <PaletteList />}

      {tab === "packs" &&
        (shownPacks.length ? (
          <ul className={ASSET_GRID}>
            {shownPacks.map((pack) => (
              <li key={pack.id}>
                <PackCard
                  pack={pack}
                  tint={
                    pack.background
                      ? ""
                      : assetTint(packById.get(pack.id)?.index ?? 0)
                  }
                  favourite={favourites.packs.has(pack.id)}
                  onFavourite={(on) => favourites.pack(pack.id, on)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            className="mt-12"
            title={packs.length ? "No packs match" : "No packs yet"}
            description={
              packs.length
                ? "Try another search or fewer filters."
                : "The Pigxel team is drawing them. Check back soon."
            }
          />
        ))}

      {tab === "all" && (
        <>
          {!filtered && recent.length > 0 && (
            <section aria-labelledby="assets-recent" className="mb-10">
              <SectionHeader id="assets-recent" title="Recently used" />
              <ul className={ASSET_GRID}>
                {recent.slice(0, 6).map((asset) => (
                  <AssetCardItem
                    key={asset.id}
                    asset={asset}
                    packs={packById}
                    favourite={favourites.assets.has(asset.id)}
                    onFavourite={(on) => favourites.asset(asset.id, on)}
                    onOpen={() => setOpen(asset)}
                  />
                ))}
              </ul>
            </section>
          )}
          <AssetResults
            title={
              filters.pack
                ? (packById.get(filters.pack)?.pack.name ?? "Assets")
                : "All assets"
            }
            filters={filters}
            firstPage={initialTab === "all" ? firstPage : null}
            packs={packById}
            favourites={favourites.assets}
            onFavourite={favourites.asset}
            onOpen={setOpen}
          />
        </>
      )}

      {open && (
        <AssetDialog
          asset={open}
          pack={
            packById.get(open.packId)?.pack ?? {
              id: open.packId,
              name: open.packId,
              premium: open.premium,
            }
          }
          tagNames={tagNames}
          favourite={favourites.assets.has(open.id)}
          onFavourite={(on) => favourites.asset(open.id, on)}
          onPack={(packId) => router.push(packViewUrl(packId))}
          onTag={showTag}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
