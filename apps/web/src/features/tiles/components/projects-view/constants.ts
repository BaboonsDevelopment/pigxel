export const FILTERS = [
  "All",
  "Projects",
  "Folders",
  "Shared",
  "Favourite",
] as const;

export type Filter = (typeof FILTERS)[number];

export type Folder = {
  id: string;
  name: string;
  count: number;
  projects: {
    id: string;
    name: string;
    thumbnail: string | null;
    at: number;
  }[];
};
