import type { Size } from "@/features/explore/constants";

export const FILTERS = [
  "All",
  "Projects",
  "Folders",
  "Shared",
  "Favourite",
] as const;

export type Filter = (typeof FILTERS)[number];

export const STORAGES = [
  { value: "any", label: "Any storage" },
  { value: "browser", label: "This browser" },
  { value: "cloud", label: "Pigxel cloud" },
  { value: "drive", label: "Google Drive" },
] as const;

export type Storage = (typeof STORAGES)[number]["value"];

export const PUBLISHED = [
  { value: "any", label: "Any" },
  { value: "yes", label: "Published" },
  { value: "no", label: "Not published" },
] as const;

export type Published = (typeof PUBLISHED)[number]["value"];

export type ProjectFilters = {
  size: Size;
  animated: boolean;
  storage: Storage;
  label: string | null;
  published: Published;
};

export const NO_PROJECT_FILTERS: ProjectFilters = {
  size: "any",
  animated: false,
  storage: "any",
  label: null,
  published: "any",
};
