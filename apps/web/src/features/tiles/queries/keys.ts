import type { ProjectQuery } from "../search";

export type ProjectListParams = ProjectQuery & {
  folderId: string | null;
  archived: boolean;
};

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: ProjectListParams) =>
    [...projectKeys.lists(), params] as const,
  recent: () => [...projectKeys.all, "recent"] as const,
  saved: (query: string) => [...projectKeys.all, "saved", query] as const,
  savedAll: () => [...projectKeys.all, "saved"] as const,
  labels: () => [...projectKeys.all, "labels"] as const,
};

export function listParams(
  filters: Omit<ProjectQuery, "query" | "archived">,
  query: string,
  folderId: string | null,
  archived = false,
): ProjectListParams {
  return {
    folderId,
    archived,
    size: filters.size,
    animated: filters.animated,
    label: filters.label,
    published: filters.published,
    query,
  };
}
