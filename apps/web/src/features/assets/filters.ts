import { CANVAS_SIZES, type CanvasSize } from "@/features/explore/constants";

/** The Assets page's views. */
export const ASSET_TABS = [
  { value: "all", label: "All assets" },
  { value: "packs", label: "Packs" },
  { value: "palettes", label: "Palettes" },
] as const;

export type AssetTab = (typeof ASSET_TABS)[number]["value"];

export const ASSET_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "az", label: "Name A–Z" },
  { value: "za", label: "Name Z–A" },
] as const;

export type AssetSort = (typeof ASSET_SORTS)[number]["value"];

export const MOTIONS = [
  { value: "any", label: "Any" },
  { value: "animated", label: "Animated" },
  { value: "still", label: "Still" },
] as const;

export const KINDS = [
  { value: "any", label: "Any" },
  { value: "sprite", label: "Sprites" },
  { value: "tile", label: "Seamless tiles" },
] as const;

export const ACCESS = [
  { value: "any", label: "Any" },
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
] as const;

export type AssetFilters = {
  query: string;
  tags: string[];
  size: CanvasSize;
  motion: (typeof MOTIONS)[number]["value"];
  kind: (typeof KINDS)[number]["value"];
  access: (typeof ACCESS)[number]["value"];
  /** One pack's assets, or every pack's. */
  pack: string | null;
  favourites: boolean;
  sort: AssetSort;
};

export const NO_ASSET_FILTERS: AssetFilters = {
  query: "",
  tags: [],
  size: "any",
  motion: "any",
  kind: "any",
  access: "any",
  pack: null,
  favourites: false,
  sort: "newest",
};

/** How many filters (not search or sort) are on, for the Filters button. */
export const activeFilters = (filters: AssetFilters) =>
  Number(filters.tags.length > 0) +
  Number(filters.size !== "any") +
  Number(filters.motion !== "any") +
  Number(filters.kind !== "any") +
  Number(filters.access !== "any") +
  Number(filters.pack !== null) +
  Number(filters.favourites);

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const QUERY_MAX = 100;

const pick = <T extends { value: string }>(
  options: readonly T[],
  value: string | undefined,
): T["value"] =>
  options.find((o) => o.value === value)?.value ?? options[0]!.value;

export type AssetSearchParams = Partial<
  Record<
    | "tab"
    | "q"
    | "tags"
    | "size"
    | "motion"
    | "kind"
    | "access"
    | "pack"
    | "fav"
    | "sort"
    | "asset",
    string
  >
>;

/** Reads the view from the page address; anything unknown falls back. */
export function readAssetView(params: AssetSearchParams): {
  tab: AssetTab;
  filters: AssetFilters;
  asset: string | null;
} {
  return {
    tab: ASSET_TABS.find((tab) => tab.value === params.tab)?.value ?? "packs",
    asset: params.asset && SLUG.test(params.asset) ? params.asset : null,
    filters: {
      query: (params.q ?? "").slice(0, QUERY_MAX),
      tags: (params.tags ?? "")
        .split(",")
        .filter((tag) => SLUG.test(tag))
        .slice(0, 10),
      size: pick(CANVAS_SIZES, params.size),
      motion: pick(MOTIONS, params.motion),
      kind: pick(KINDS, params.kind),
      access: pick(ACCESS, params.access),
      pack: params.pack && SLUG.test(params.pack) ? params.pack : null,
      favourites: params.fav === "1",
      sort: pick(ASSET_SORTS, params.sort),
    },
  };
}

/** Filters as address parameters, leaving out what's at its default. */
function filterParams(filters: AssetFilters) {
  const params = new URLSearchParams();
  const { query, tags, size, motion, kind, access, pack, favourites, sort } =
    filters;
  if (query.trim()) params.set("q", query.trim());
  if (tags.length) params.set("tags", tags.join(","));
  if (size !== "any") params.set("size", size);
  if (motion !== "any") params.set("motion", motion);
  if (kind !== "any") params.set("kind", kind);
  if (access !== "any") params.set("access", access);
  if (pack) params.set("pack", pack);
  if (favourites) params.set("fav", "1");
  if (sort !== "newest") params.set("sort", sort);
  return params;
}

/** The page address for a view. */
export function assetViewUrl(
  tab: AssetTab,
  filters: AssetFilters,
  asset: string | null = null,
) {
  const params = filterParams(filters);
  if (tab !== "packs") params.set("tab", tab);
  if (asset) params.set("asset", asset);
  const search = params.toString();
  return search ? `/assets?${search}` : "/assets";
}

/** A pack's page; its filters leave out the pack, which the page fixes. */
export function packViewUrl(
  packId: string,
  filters: AssetFilters = NO_ASSET_FILTERS,
  asset: string | null = null,
) {
  const params = filterParams({ ...filters, pack: null });
  if (asset) params.set("asset", asset);
  const search = params.toString();
  const path = `/assets/packs/${encodeURIComponent(packId)}`;
  return search ? `${path}?${search}` : path;
}

/** Filters that came from elsewhere, checked the way the address is. */
export const cleanFilters = (filters: AssetFilters): AssetFilters =>
  readAssetView(Object.fromEntries(filterParams(filters))).filters;

/** Size range of a size filter, in pixels on the longer side. */
export const sizeRange = (size: CanvasSize) =>
  CANVAS_SIZES.find((s) => s.value === size) ?? CANVAS_SIZES[0];

/** What a pack offers to the Packs tab's search, filters and sort. */
export type PackFacts = {
  id: string;
  name: string;
  description: string | null;
  premium: boolean;
  tags: string[];
  longestSide: number;
  animated: number;
  count: number;
  uses: number;
  createdAt: string;
};

/**
 * The packs the Packs tab shows for these filters, in order. Search matches
 * the name, id, description and tag names; filters about single assets
 * (sprite or tile) don't apply to packs.
 */
export function filterPacks<Pack extends PackFacts>(
  packs: readonly Pack[],
  filters: AssetFilters,
  {
    favourites,
    tagNames,
  }: { favourites: ReadonlySet<string>; tagNames: ReadonlyMap<string, string> },
): Pack[] {
  const term = filters.query.trim().replace(/^#/, "").toLowerCase();
  const range = sizeRange(filters.size);
  const shown = packs.filter((pack) => {
    if (filters.favourites && !favourites.has(pack.id)) return false;
    if (filters.access === "premium" && !pack.premium) return false;
    if (filters.access === "free" && pack.premium) return false;
    if (filters.tags.some((tag) => !pack.tags.includes(tag))) return false;
    if (filters.motion === "animated" && pack.animated === 0) return false;
    if (filters.motion === "still" && pack.animated === pack.count)
      return false;
    if (range.max && pack.longestSide > range.max) return false;
    if (range.min && pack.longestSide < range.min) return false;
    if (!term) return true;
    return [
      pack.name,
      pack.id,
      pack.description ?? "",
      ...pack.tags.map((tag) => tagNames.get(tag) ?? tag),
    ].some((text) => text.toLowerCase().includes(term));
  });
  const byName = (a: Pack, b: Pack) => a.name.localeCompare(b.name);
  if (filters.sort === "az") return shown.sort(byName);
  if (filters.sort === "za") return shown.sort((a, b) => byName(b, a));
  if (filters.sort === "popular")
    return shown.sort((a, b) => b.uses - a.uses || byName(a, b));
  return shown.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || byName(a, b),
  );
}

/**
 * Packs like this one, for its page: the most shared tags first, then the
 * same size, then the more popular. Never the pack itself.
 */
export function relatedPacks<Pack extends PackFacts>(
  pack: PackFacts,
  packs: readonly Pack[],
  limit = 6,
): Pack[] {
  const shared = (other: PackFacts) =>
    other.tags.filter((tag) => pack.tags.includes(tag)).length;
  const sameSize = (other: PackFacts) =>
    Number(other.longestSide === pack.longestSide);
  return packs
    .filter((other) => other.id !== pack.id)
    .map((other) => ({ other, score: [shared(other), sameSize(other)] }))
    .sort(
      (a, b) =>
        b.score[0]! - a.score[0]! ||
        b.score[1]! - a.score[1]! ||
        b.other.uses - a.other.uses ||
        a.other.name.localeCompare(b.other.name),
    )
    .slice(0, limit)
    .map(({ other }) => other);
}
