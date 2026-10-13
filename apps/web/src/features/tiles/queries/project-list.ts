"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { loadCloudTiles, loadCloudTilesCounted } from "../actions";
import { PAGE_SIZE } from "../constants";
import { projectKeys, type ProjectListParams } from "./keys";

type ProjectPage = { tiles: CloudTileSummary[]; count: number | null };

type ProjectList = InfiniteData<ProjectPage, number>;

export function useProjectList(
  params: ProjectListParams,
  { enabled }: { enabled: boolean },
) {
  const { folderId, ...options } = params;
  const query = useInfiniteQuery({
    queryKey: projectKeys.list(params),
    queryFn: async ({ pageParam }): Promise<ProjectPage> =>
      pageParam === 0
        ? loadCloudTilesCounted(folderId, options)
        : {
            tiles: await loadCloudTiles(pageParam, folderId, options),
            count: null,
          },
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.tiles.length < PAGE_SIZE
        ? undefined
        : pages.reduce((loaded, page) => loaded + page.tiles.length, 0),
    placeholderData: keepPreviousData,
    enabled,
  });
  const pages = enabled ? (query.data?.pages ?? []) : [];
  const seen = new Set<string>();
  return {
    tiles: pages
      .flatMap((page) => page.tiles)
      .filter((tile) => !seen.has(tile.id) && seen.add(tile.id)),
    count: pages[0]?.count ?? 0,
    loaded: !enabled || (query.isSuccess && !query.isPlaceholderData),
    hasMore: enabled && query.hasNextPage,
    loadMore: () => {
      if (!query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}

export function patchProjectLists(
  client: QueryClient,
  tileId: string,
  patch: Partial<CloudTileSummary> | null,
  where: (params: ProjectListParams) => boolean = () => true,
) {
  client.setQueriesData<ProjectList>(
    {
      queryKey: projectKeys.lists(),
      predicate: (query) => where(query.queryKey[2] as ProjectListParams),
    },
    (list) => {
      if (!list) return list;
      const removed =
        !patch &&
        list.pages.some((page) => page.tiles.some((t) => t.id === tileId))
          ? 1
          : 0;
      return {
        ...list,
        pages: list.pages.map((page, index) => ({
          tiles: page.tiles.flatMap((tile) =>
            tile.id !== tileId ? [tile] : patch ? [{ ...tile, ...patch }] : [],
          ),
          count:
            index === 0 && page.count !== null
              ? page.count - removed
              : page.count,
        })),
      };
    },
  );
}

export function useInvalidateProjects() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: projectKeys.lists() }),
      client.invalidateQueries({ queryKey: projectKeys.recent() }),
    ]);
}
