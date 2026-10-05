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

export const SORTS = [
  { value: "popular", label: "Popular" },
  { value: "recent", label: "Recent" },
  { value: "az", label: "A-Z" },
  { value: "liked", label: "Liked" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];
