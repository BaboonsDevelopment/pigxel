export const FILTERS = [
  "All",
  "Projects",
  "Folders",
  "Shared",
  "Favourite",
] as const;

export type Filter = (typeof FILTERS)[number];
