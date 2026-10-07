export const PERIODS = [
  { value: "week", label: "This week", days: 7 },
  { value: "month", label: "Month", days: 30 },
  { value: "year", label: "Year", days: 365 },
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

export const DESCRIPTION_MAX = 500;

export const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "recent", label: "Recent" },
  { value: "az", label: "A-Z" },
  { value: "liked", label: "Liked" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];
