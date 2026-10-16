import type { CanvasSize } from "@/features/explore/constants";

export const FILTERS = [
  "All",
  "Projects",
  "Folders",
  "Shared",
  "Favourite",
  "Archive",
] as const;

export type Filter = (typeof FILTERS)[number];

export const STORAGES = [
  { value: "any", label: "Any storage" },
  { value: "cloud", label: "Pigxel cloud" },
  { value: "browser", label: "Not saved" },
] as const;

export type Storage = (typeof STORAGES)[number]["value"];

export const PUBLISHED = [
  { value: "any", label: "Any" },
  { value: "yes", label: "Published" },
  { value: "no", label: "Not published" },
] as const;

export type Published = (typeof PUBLISHED)[number]["value"];

export type ProjectFilters = {
  size: CanvasSize;
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

export function filtersKey(filters: ProjectFilters, query = "") {
  const { size, animated, storage, label, published } = filters;
  return JSON.stringify([size, animated, storage, label, published, query]);
}

export const PROJECT_SORTS = [
  { value: "edited", label: "Last edited" },
  { value: "oldest", label: "Oldest edited" },
  { value: "az", label: "Name A–Z" },
  { value: "za", label: "Name Z–A" },
] as const;

export type ProjectSort = (typeof PROJECT_SORTS)[number]["value"];
