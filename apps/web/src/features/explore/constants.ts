export const PERIODS = [
  { value: "week", label: "This week", days: 7 },
  { value: "month", label: "This month", days: 30 },
  { value: "year", label: "This year", days: 365 },
  { value: "all", label: "All time", days: 0 },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

export const PAGE_SIZE = 20;

export const CATEGORIES = [
  "All",
  "Buildings",
  "Characters",
  "Fantasy",
  "Environment",
  "Icons",
] as const;

export const TAGS = CATEGORIES.filter((c) => c !== "All");

export type Size = "any" | "16" | "32" | "64" | "larger";

type SizeOption = { value: Size; label: string; min?: number; max?: number };

export const SIZES: readonly [SizeOption, ...SizeOption[]] = [
  { value: "any", label: "Any size" },
  { value: "16", label: "16×16", max: 16 },
  { value: "32", label: "32×32", min: 17, max: 32 },
  { value: "64", label: "64×64", min: 33, max: 64 },
  { value: "larger", label: "Larger", min: 65 },
];

export const QUERY_MAX = 100;

export const FEEDS = [
  { value: "all", label: "Everyone" },
  { value: "following", label: "Following" },
] as const;

export type Feed = (typeof FEEDS)[number]["value"];

export type ExploreFilters = {
  tags: string[];
  size: Size;
  animated: boolean;
  query: string;
  sort: Sort;
  period: Period;
  feed: Feed;
};

export const NO_FILTERS: ExploreFilters = {
  tags: [],
  size: "any",
  animated: false,
  query: "",
  sort: "popular",
  period: "week",
  feed: "all",
};

export const DESCRIPTION_MAX = 500;

export const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "recent", label: "Recent" },
  { value: "az", label: "A-Z" },
  { value: "liked", label: "Liked" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];
