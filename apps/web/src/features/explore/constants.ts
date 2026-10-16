export const PERIODS = [
  { value: "today", label: "Today", days: 1 },
  { value: "week", label: "This week", days: 7 },
  { value: "month", label: "This month", days: 30 },
  { value: "year", label: "This year", days: 365 },
  { value: "all", label: "All time", days: 0 },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

export const DEFAULT_PERIOD: Period = "week";

export const MAX_TAGS = 5;

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

export type CanvasSize = "any" | "16" | "32" | "64" | "128" | "256";

type CanvasSizeOption = {
  value: CanvasSize;
  label: string;
  min?: number;
  max?: number;
};

export const CANVAS_SIZES: readonly [CanvasSizeOption, ...CanvasSizeOption[]] =
  [
    { value: "any", label: "Any" },
    { value: "16", label: "16×16", max: 16 },
    { value: "32", label: "32×32", min: 17, max: 32 },
    { value: "64", label: "64×64", min: 33, max: 64 },
    { value: "128", label: "128×128", min: 65, max: 128 },
    { value: "256", label: "256×256", min: 129, max: 256 },
  ];

export const ANIMATIONS = [
  { value: "all", label: "All artwork" },
  { value: "animated", label: "Animated only" },
  { value: "still", label: "Static only" },
] as const;

export type Animation = (typeof ANIMATIONS)[number]["value"];

export const QUERY_MAX = 100;

export const FEEDS = [
  { value: "all", label: "Everyone" },
  { value: "following", label: "Following only" },
] as const;

export type Feed = (typeof FEEDS)[number]["value"];

export type ExploreFilters = {
  tags: string[];
  size: CanvasSize;
  animation: Animation;
  mine: boolean;
  query: string;
  sort: Sort;
  period: Period;
  feed: Feed;
};

export const NO_FILTERS: ExploreFilters = {
  tags: [],
  size: "any",
  animation: "all",
  mine: false,
  query: "",
  sort: "popular",
  period: DEFAULT_PERIOD,
  feed: "all",
};

export const DESCRIPTION_MAX = 500;

export const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "recent", label: "Recent" },
  { value: "mostLiked", label: "Most liked" },
  { value: "az", label: "A–Z" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];

export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "copyright", label: "Copyright" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_DETAILS_MAX = 500;
