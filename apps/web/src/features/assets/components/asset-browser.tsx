"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@pigxel/ui/components/button";
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
const SEARCH_DELAY = 300;
const PRELOAD = "1200px";

export type AssetPage = { assets: Asset[]; count: number };

/** Filters, with search applied once typing pauses. */
export function useAssetFilters(initial: AssetFilters, suggestTags = false) {
  const [filters, setFilters] = useState(() =>
    suggestTags && initial.query.trim() === "#"
      ? { ...initial, query: "" }
      : initial,
  );
  const [typed, setTyped] = useState(initial.query);
  useEffect(() => {
    const query = suggestTags
      ? typed.replace(/(?:^|\s)#[^\s#]*$/, "").trim()
      : typed;
    if (query === filters.query) return;
    const timer = setTimeout(
      () => setFilters((f) => ({ ...f, query })),
      SEARCH_DELAY,
    );
    return () => clearTimeout(timer);
  }, [typed, filters.query, suggestTags]);
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

/** Full-width browse search, or compact controls for pack/editor views. */
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
  layout = "compact",
  controls,
}: {
  layout?: "compact" | "browse";
  controls?: ReactNode;
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
    <div
      className={
        layout === "browse"
          ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6"
          : "flex flex-wrap items-center gap-3"
      }
    >
      <label
        className={`flex h-[42px] min-w-0 items-center gap-3 rounded-xl border bg-background px-4 text-[#4a1f35] transition-colors focus-within:border-[#963353] ${layout === "browse" ? "w-full border-[#ffb3cf] sm:flex-1" : "w-full border-[#e7c6d2] sm:w-[426px] sm:shrink"}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          className="size-5 shrink-0 text-[#8e697a]"
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
          className="h-full min-w-0 flex-1 bg-transparent text-base tracking-[0.03em] outline-none placeholder:text-[#ad98a2]"
        />
      </label>
      <div
        className={
          layout === "browse"
            ? "flex shrink-0 items-center gap-3 sm:w-60"
            : "contents"
        }
      >
        {layout !== "browse" && (
          <ToolbarMenu
            label="Sort"
            icon={<SortIcon />}
            options={ASSET_SORTS}
            value={filters.sort}
            onChange={(sort) => onFilters({ ...filters, sort })}
          />
        )}
        {sidebar ? (
          <AssetFiltersToggle
            className={
              layout === "browse"
                ? "flex h-[42px] w-full cursor-pointer items-center gap-3 rounded-xl border border-[#ffb3cf] bg-background px-4 text-sm font-semibold text-[#4a2434] transition-colors hover:bg-[#fff2f7] aria-expanded:border-primary [&>svg:first-child]:hidden [&>svg:last-child]:ml-auto [&>svg:last-child]:text-primary"
                : undefined
            }
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
        {controls}
      </div>
    </div>
  );
}

/** Where each pack's cards draw their colour from. */
type PackLookup = ReadonlyMap<string, { pack: Pack; index: number }>;

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
  showHeading = true,
  renderControls,
  beforeResults,
  grid = ASSET_GRID,
  filters,
  firstPage,
  packs,
  favourites,
  onFavourite,
  onOpen,
}: {
  title: ReactNode;
  showHeading?: boolean;
  renderControls?: (state: {
    count: number | null;
    loading: boolean;
  }) => ReactNode;
  beforeResults?: ReactNode;
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
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = list;
  useEffect(() => {
    const target = sentinel.current;
    if (!hasNextPage || !target || isFetchNextPageError) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { root: scrollParent(target), rootMargin: `0px 0px ${PRELOAD} 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  return (
    <section
      aria-labelledby="assets-results"
      aria-busy={list.isFetching && !list.isFetchingNextPage}
    >
      {renderControls?.({
        count: list.data && !list.isPlaceholderData ? count : null,
        loading: list.isPending || list.isPlaceholderData,
      })}
      {beforeResults}
      <SectionHeader
        id="assets-results"
        className={showHeading ? undefined : "sr-only"}
        title={title}
        actions={
          list.isSuccess && (
            <Text size="xs" tone="muted" className="tabular-nums">
              {count} {count === 1 ? "asset" : "assets"}
            </Text>
          )
        }
      />
      {list.isError && assets.length === 0 ? (
        <div className="rounded-xl border border-destructive/20 bg-white p-5">
          <FormMessage tone="error">
            Couldn’t load assets. Please try again.
          </FormMessage>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void list.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : list.isSuccess && assets.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="Nothing matches"
          description="Try another search or fewer filters."
        />
      ) : list.isPending ? (
        <ul className={grid} aria-label="Loading assets">
          {Array.from({ length: 6 }, (_, index) => (
            <li
              key={index}
              aria-hidden="true"
              className="animate-pulse motion-reduce:animate-none"
            >
              <div className="aspect-square rounded-2xl bg-pastel-pink-soft" />
              <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
            </li>
          ))}
        </ul>
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
      {list.isFetchNextPageError && (
        <FormMessage tone="error" className="mt-5">
          Couldn’t load more assets. Your loaded results are still here; try
          Load more again.
        </FormMessage>
      )}
      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="secondary"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? "Loading more…" : "Load more assets"}
          </Button>
        </div>
      )}
      <div ref={sentinel} aria-hidden="true" className="h-px" />
    </section>
  );
}
