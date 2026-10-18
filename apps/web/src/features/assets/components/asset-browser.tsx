"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { SectionHeader, Text } from "@pigxel/ui/components/typography";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { SortIcon } from "@/features/tiles/components/projects-view/components/toolbar-icons";
import { ToolbarMenu } from "@/features/tiles/components/projects-view/components/toolbar-menu";
import { loadAssetPage, setAssetFavourite, setPackFavourite } from "../actions";
import type { Asset } from "../assets";
import { assetTint } from "../constants";
import { ASSET_SORTS, type AssetFilters } from "../filters";
import type { AssetTag, PackCard as Pack } from "../server";
import { AssetCard } from "./asset-card";
import { AssetFiltersMenu, AssetFiltersToggle } from "./asset-filters-menu";

/** Wider layouts add columns (inside a ScaledPage) rather than bigger cards. */
export const ASSET_GRID =
  "grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 @min-[1480px]:grid-cols-7 @min-[1680px]:grid-cols-8";
/** The same grid beside the filters sidebar, one column narrower. */
export const ASSET_GRID_BESIDE_FILTERS =
  "grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 @min-[1480px]:grid-cols-6 @min-[1680px]:grid-cols-7";
const SEARCH_DELAY = 300;
const PRELOAD = "1200px";

export type AssetPage = { assets: Asset[]; count: number };

/** Filters, with search applied once typing pauses. */
export function useAssetFilters(initial: AssetFilters) {
  const [filters, setFilters] = useState(initial);
  const [typed, setTyped] = useState(initial.query);
  useEffect(() => {
    if (typed === filters.query) return;
    const timer = setTimeout(
      () => setFilters((f) => ({ ...f, query: typed })),
      SEARCH_DELAY,
    );
    return () => clearTimeout(timer);
  }, [typed, filters.query]);
  return {
    filters,
    typed,
    setTyped,
    setFilters,
    /** Replaces the filters and the search box together. */
    reset: (next: AssetFilters) => {
      setTyped(next.query);
      setFilters(next);
    },
  };
}

/** The person's favourite assets and packs, toggled optimistically. */
export function useFavourites(initial: { assets: string[]; packs: string[] }) {
  const [assets, setAssets] = useState(() => new Set(initial.assets));
  const [packs, setPacks] = useState(() => new Set(initial.packs));
  const [error, setError] = useState<string | null>(null);
  const toggle = async (
    id: string,
    on: boolean,
    set: typeof setAssets,
    save: (id: string, on: boolean) => Promise<{ error?: string }>,
  ) => {
    const flip = (value: boolean) =>
      set((ids) => {
        const next = new Set(ids);
        if (value) next.add(id);
        else next.delete(id);
        return next;
      });
    flip(on);
    const result = await save(id, on).catch(() => ({
      error: "Couldn’t save that. Try again.",
    }));
    if (result.error) {
      flip(!on);
      setError(result.error);
    }
  };
  return {
    assets,
    packs,
    error,
    asset: (id: string, on: boolean) =>
      void toggle(id, on, setAssets, setAssetFavourite),
    pack: (id: string, on: boolean) =>
      void toggle(id, on, setPacks, setPackFavourite),
  };
}

/** Search, sort and filters, styled like My projects. */
export function AssetToolbar({
  typed,
  onTyped,
  placeholder,
  filters,
  onFilters,
  tags,
  packs,
  kind,
  pack,
  sidebar,
}: {
  typed: string;
  onTyped: (text: string) => void;
  placeholder: string;
  filters: AssetFilters;
  onFilters: (filters: AssetFilters) => void;
  tags: AssetTag[];
  packs: { id: string; name: string }[];
  kind?: boolean;
  pack?: boolean;
  /** Filters open a sidebar the page lays out, instead of a dropdown. */
  sidebar?: { id: string; open: boolean; onToggle: () => void };
}) {
  return (
    <div className="flex items-center gap-[23px] max-lg:flex-wrap">
      <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-[#e7c6d2] bg-background px-3 text-[#4a1f35] transition-colors focus-within:border-[#8c3a57] sm:w-[426px] sm:shrink">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="size-4 shrink-0 text-muted-foreground"
        >
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13 13 3.5 3.5" />
        </svg>
        <span className="sr-only">Search</span>
        <input
          type="search"
          placeholder={placeholder}
          value={typed}
          onChange={(e) => onTyped(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
      </label>
      <ToolbarMenu
        label="Sort"
        icon={<SortIcon />}
        options={ASSET_SORTS}
        value={filters.sort}
        onChange={(sort) => onFilters({ ...filters, sort })}
      />
      {sidebar ? (
        <AssetFiltersToggle
          filters={filters}
          open={sidebar.open}
          onToggle={sidebar.onToggle}
          controls={sidebar.id}
        />
      ) : (
        <AssetFiltersMenu
          filters={filters}
          onChange={(next) => onFilters({ ...next, query: filters.query })}
          tags={tags}
          packs={packs}
          kind={kind}
          pack={pack}
        />
      )}
    </div>
  );
}

/** Where each pack's cards draw their colour from. */
export type PackLookup = ReadonlyMap<string, { pack: Pack; index: number }>;

export function AssetCardItem({
  asset,
  packs,
  favourite,
  onFavourite,
  onOpen,
}: {
  asset: Asset;
  packs: PackLookup;
  favourite: boolean;
  onFavourite: (on: boolean) => void;
  onOpen: () => void;
}) {
  const found = packs.get(asset.packId);
  return (
    <li>
      <AssetCard
        asset={asset}
        premium={!!found?.pack.premium}
        tint={found?.pack.background ? "" : assetTint(found?.index ?? 0)}
        background={found?.pack.background ?? null}
        favourite={favourite}
        onFavourite={onFavourite}
        onOpen={onOpen}
      />
    </li>
  );
}

/** A grid of assets for some filters, loading more as it scrolls. */
export function AssetResults({
  title,
  grid = ASSET_GRID,
  filters,
  firstPage,
  packs,
  favourites,
  onFavourite,
  onOpen,
}: {
  title: ReactNode;
  /** Grid classes, for narrower places such as the editor's picker. */
  grid?: string;
  filters: AssetFilters;
  /** Already loaded on the server for these filters. */
  firstPage: AssetPage | null;
  packs: PackLookup;
  favourites: ReadonlySet<string>;
  onFavourite: (id: string, on: boolean) => void;
  onOpen: (asset: Asset) => void;
}) {
  const [seeded] = useState(() => ({ filters, firstPage }));
  const list = useInfiniteQuery({
    queryKey: ["assets", "list", filters],
    queryFn: ({ pageParam }) => loadAssetPage(filters, pageParam),
    initialPageParam: 0,
    initialData:
      seeded.firstPage && filters === seeded.filters
        ? { pages: [seeded.firstPage], pageParams: [0] }
        : undefined,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, page) => n + page.assets.length, 0);
      return loaded < last.count && last.assets.length > 0 ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });
  const assets = list.data?.pages.flatMap((page) => page.assets) ?? [];
  const count = list.data?.pages[0]?.count ?? 0;

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  useEffect(() => {
    const target = sentinel.current;
    if (!hasNextPage || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { root: scrollParent(target), rootMargin: `0px 0px ${PRELOAD} 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <section aria-labelledby="assets-results">
      <SectionHeader
        id="assets-results"
        title={title}
        actions={
          list.isSuccess && (
            <Text size="xs" tone="muted" className="tabular-nums">
              {count} {count === 1 ? "asset" : "assets"}
            </Text>
          )
        }
      />
      {list.isError ? (
        <FormMessage tone="error">
          Couldn’t load assets. Refresh the page to try again.
        </FormMessage>
      ) : list.isSuccess && assets.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="Nothing matches"
          description="Try another search or fewer filters."
        />
      ) : (
        <ul className={grid}>
          {assets.map((asset) => (
            <AssetCardItem
              key={asset.id}
              asset={asset}
              packs={packs}
              favourite={favourites.has(asset.id)}
              onFavourite={(on) => onFavourite(asset.id, on)}
              onOpen={() => onOpen(asset)}
            />
          ))}
        </ul>
      )}
      <div ref={sentinel} aria-hidden="true" className="h-px" />
    </section>
  );
}
