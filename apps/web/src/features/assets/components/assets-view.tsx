"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { SectionHeader } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { madimiOne } from "@/lib/fonts/madimi";
import { useGridSize } from "@/components/ui/grid-size-toggle";
import styles from "./assets-grid.module.css";
import type { Asset } from "../assets";
import { assetTint } from "../constants";
import {
  ASSET_TABS,
  activeFilters,
  assetViewUrl,
  filterPacks,
  NO_ASSET_FILTERS,
  packViewUrl,
  type AssetFilters,
  type AssetTab,
} from "../filters";
import type { AssetTag, PackCard as Pack } from "../server";
import {
  AssetCardItem,
  AssetResults,
  useAssetFilters,
  useFavourites,
  type AssetPage,
} from "./asset-browser";
import { AssetDialog } from "./asset-dialog";
import { AssetFiltersDrawer } from "./asset-filters-menu";
import {
  GallerySearch,
  GalleryResultsBar,
  AppliedAssetFilters,
} from "./gallery-controls";
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
  premiumAccess,
}: {
  tab: AssetTab;
  filters: AssetFilters;
  packs: Pack[];
  tags: AssetTag[];
  favourites: { assets: string[]; packs: string[] };
  recent: Asset[];
  firstPage: AssetPage | null;
  openAsset: Asset | null;
  /** Can use premium packs: a paid plan, or an admin. */
  premiumAccess: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const { filters, typed, setTyped, setFilters, reset } = useAssetFilters(
    initialFilters,
    true,
  );
  const [open, setOpen] = useState<Asset | null>(openAsset);
  const favourites = useFavourites(initialFavourites);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const id = useId();
  const [savedDensity, setDensity] = useGridSize(
    "pigxel.assets.gallery-density.v2",
  );
  const density = savedDensity === "small" ? "small" : "medium";
  const grid = cn(styles.grid, styles[density]);
  const packById = useMemo(
    () => new Map(packs.map((pack, index) => [pack.id, { pack, index }])),
    [packs],
  );
  const tagNames = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.name])),
    [tags],
  );
  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      assetViewUrl(tab, filters, open?.id ?? null),
    );
  }, [tab, filters, open]);
  const shownPacks = useMemo(
    () =>
      filterPacks(packs, filters, { favourites: favourites.packs, tagNames }),
    [packs, filters, favourites.packs, tagNames],
  );
  const filtered =
    JSON.stringify({ ...filters, sort: "" }) !==
    JSON.stringify({ ...NO_ASSET_FILTERS, sort: "" });
  const active = activeFilters(filters);
  const selectTab = (next: AssetTab) => {
    setTab(next);
    if (next === "packs")
      setFilters((current) => ({ ...current, kind: "any", pack: null }));
  };
  const showTag = (tagId: string) => {
    setTab("all");
    reset({ ...NO_ASSET_FILTERS, tags: [tagId], sort: filters.sort });
  };
  const resultsBar = (count: number | null, loading = false) => (
    <GalleryResultsBar
      count={count}
      noun={tab === "packs" ? "packs" : "assets"}
      loading={loading}
      filters={filters}
      onFilters={setFilters}
      density={density}
      onDensity={setDensity}
    />
  );
  const recentlyUsed =
    !filtered && recent.length > 0 ? (
      <section aria-labelledby={`${id}-recent`} className="mb-8">
        <SectionHeader id={`${id}-recent`} title="Recently used" />
        <ul className={grid}>
          {recent.slice(0, 5).map((asset) => (
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
    ) : null;

  return (
    <div className={styles.browser}>
      <header className="mb-5">
        <h1
          className={cn(
            madimiOne.className,
            "text-[36px] leading-tight tracking-[0.02em] text-[#4a2434] md:text-[40px]",
          )}
        >
          Assets
        </h1>
        <div
          role="tablist"
          aria-label="View"
          className="mt-5 inline-flex max-w-full gap-0.5 rounded-2xl border border-[#ebcad8] bg-white p-1"
        >
          {ASSET_TABS.map((option, index) => (
            <button
              key={option.value}
              id={`${id}-${option.value}`}
              type="button"
              role="tab"
              tabIndex={tab === option.value ? 0 : -1}
              aria-selected={tab === option.value}
              aria-controls={`${id}-results`}
              onClick={() => selectTab(option.value)}
              onKeyDown={(event) => {
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % ASSET_TABS.length
                    : event.key === "ArrowLeft"
                      ? (index + ASSET_TABS.length - 1) % ASSET_TABS.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? ASSET_TABS.length - 1
                          : null;
                if (next === null) return;
                event.preventDefault();
                selectTab(ASSET_TABS[next]!.value);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [next]?.focus();
              }}
              className="h-10 cursor-pointer rounded-xl border border-transparent px-4 text-sm text-[#704258] transition-colors hover:bg-[#fff2f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-selected:border-[#c66a8b] aria-selected:bg-[#fde5ee] aria-selected:text-[#4a2434] sm:px-5"
            >
              {option.label}
            </button>
          ))}
        </div>
        {tab !== "palettes" && (
          <>
            <div className="mt-4 flex items-start gap-3">
              <GallerySearch
                value={typed}
                onChange={setTyped}
                noun={tab === "packs" ? "packs" : "assets"}
                tags={tags}
                selected={filters.tags}
                onBrowseTags={() => setFiltersOpen(true)}
                onTag={(tagId, query) => {
                  if (filters.tags.length >= 10) return;
                  setTyped(query);
                  setFilters({
                    ...filters,
                    query,
                    tags: [...new Set([...filters.tags, tagId])],
                  });
                }}
              />
              <button
                type="button"
                aria-label={`Filters${active ? `, ${active} on` : ""}`}
                aria-haspopup="dialog"
                aria-expanded={filtersOpen}
                aria-controls={filtersOpen ? `${id}-filters` : undefined}
                onClick={() => setFiltersOpen(true)}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#e7c6d2] bg-white px-3.5 text-sm font-medium text-[#4a2434] transition-colors hover:border-primary hover:bg-[#fff2f7]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  className="size-4"
                >
                  <path d="M3 5h14M5 10h10M7 15h6" />
                </svg>
                Filters
                {active > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#fde5ee] text-[11px] text-primary">
                    {active}
                  </span>
                )}
              </button>
            </div>
            <AppliedAssetFilters
              filters={filters}
              onChange={setFilters}
              tags={tags}
              packs={packs}
            />
          </>
        )}
      </header>
      {favourites.error && (
        <FormMessage tone="error" className="mb-4">
          {favourites.error}
        </FormMessage>
      )}
      <div
        id={`${id}-results`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
      >
        {tab === "palettes" && <PaletteList />}
        {tab === "packs" && (
          <>
            {resultsBar(shownPacks.length)}
            {shownPacks.length ? (
              <ul className={grid}>
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
                      premiumAccess={premiumAccess}
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
                    ? "Try another search or clear a filter."
                    : "The Pigxel team is drawing them. Check back soon."
                }
              />
            )}
          </>
        )}
        {tab === "all" && (
          <AssetResults
            showHeading={!!recentlyUsed}
            title={
              filters.pack
                ? (packById.get(filters.pack)?.pack.name ?? "Assets")
                : "All assets"
            }
            renderControls={({ count, loading }) => resultsBar(count, loading)}
            beforeResults={recentlyUsed}
            grid={grid}
            filters={filters}
            firstPage={initialTab === "all" ? firstPage : null}
            packs={packById}
            favourites={favourites.assets}
            onFavourite={favourites.asset}
            onOpen={setOpen}
          />
        )}
      </div>
      {filtersOpen && tab !== "palettes" && (
        <AssetFiltersDrawer
          id={`${id}-filters`}
          filters={filters}
          onApply={reset}
          onClose={() => setFiltersOpen(false)}
          tags={tags}
          packs={packs}
          tab={tab}
          favourites={favourites.packs}
        />
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
