import { SIZES } from "@/features/explore/constants";
import type { Label } from "../../labels";
import { cleanSearch } from "../../search";
import {
  FILTERS,
  NO_PROJECT_FILTERS,
  PROJECT_SORTS,
  PUBLISHED,
  STORAGES,
  type Filter,
  type ProjectFilters,
  type ProjectSort,
} from "./constants";

export type ProjectsViewState = {
  filter: Filter;
  query: string;
  filters: ProjectFilters;
  sort: ProjectSort;
};

export type ViewParams = {
  tab?: string;
  q?: string;
  size?: string;
  storage?: string;
  animated?: string;
  label?: string;
  published?: string;
  sort?: string;
};

export function readView(
  params: ViewParams,
  labels: Label[],
): ProjectsViewState {
  return {
    filter:
      FILTERS.find((f) => f.toLowerCase() === params.tab?.toLowerCase()) ??
      "All",
    query: cleanSearch(params.q ?? ""),
    sort: PROJECT_SORTS.find((s) => s.value === params.sort)?.value ?? "edited",
    filters: {
      size:
        SIZES.find((s) => s.value === params.size)?.value ??
        NO_PROJECT_FILTERS.size,
      storage:
        STORAGES.find((s) => s.value === params.storage)?.value ??
        NO_PROJECT_FILTERS.storage,
      animated: params.animated === "1",
      label: labels.find((l) => l.id === params.label)?.id ?? null,
      published:
        PUBLISHED.find((p) => p.value === params.published)?.value ??
        NO_PROJECT_FILTERS.published,
    },
  };
}

export function viewSearch({
  filter,
  query,
  filters,
  sort,
}: ProjectsViewState) {
  const params = new URLSearchParams();
  if (filter !== "All") params.set("tab", filter.toLowerCase());
  if (query) params.set("q", query);
  if (sort !== "edited") params.set("sort", sort);
  if (filters.size !== NO_PROJECT_FILTERS.size)
    params.set("size", filters.size);
  if (filters.storage !== NO_PROJECT_FILTERS.storage)
    params.set("storage", filters.storage);
  if (filters.animated) params.set("animated", "1");
  if (filters.label) params.set("label", filters.label);
  if (filters.published !== NO_PROJECT_FILTERS.published)
    params.set("published", filters.published);
  const search = params.toString();
  return search ? `?${search}` : "";
}
