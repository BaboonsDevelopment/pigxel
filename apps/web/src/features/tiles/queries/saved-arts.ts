"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { setTileSaved } from "@/features/explore/actions";
import type { SavedArt } from "@/features/explore/server";
import { searchSavedArts } from "../actions";
import { PAGE_SIZE } from "../constants";
import { projectKeys } from "./keys";
import { showSnackbar, showUndo } from "@/components/ui/snackbar";

type SavedPage = { arts: SavedArt[]; count: number | null };

export function useSavedArts(query: string) {
  const result = useInfiniteQuery({
    queryKey: projectKeys.saved(query),
    queryFn: ({ pageParam }) => searchSavedArts(query, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.arts.length < PAGE_SIZE
        ? undefined
        : pages.reduce((loaded, page) => loaded + page.arts.length, 0),
    placeholderData: keepPreviousData,
  });
  const pages = result.data?.pages ?? [];
  const seen = new Set<string>();
  return {
    arts: pages
      .flatMap((page) => page.arts)
      .filter((art) => !seen.has(art.id) && seen.add(art.id)),
    count: pages[0]?.count ?? 0,
    loaded: result.isSuccess && !result.isPlaceholderData,
    hasMore: result.hasNextPage,
    loadMore: () => {
      if (!result.isFetchingNextPage) void result.fetchNextPage();
    },
  };
}

export function useUnsaveArt() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (art: SavedArt) => {
      const result = await setTileSaved(art.id, false);
      if (result.error) throw new Error(result.error);
    },
    onMutate: (art) => {
      client.setQueriesData<InfiniteData<SavedPage, number>>(
        { queryKey: projectKeys.savedAll() },
        (list) =>
          list && {
            ...list,
            pages: list.pages.map((page, index) => ({
              arts: page.arts.filter((saved) => saved.id !== art.id),
              count:
                index === 0 && page.count !== null
                  ? Math.max(0, page.count - 1)
                  : page.count,
            })),
          },
      );
    },
    onSuccess: (_, art) =>
      showUndo("Removed from favorites.", async () => {
        const result = await setTileSaved(art.id, true);
        if (result.error) showSnackbar(result.error);
        void client.invalidateQueries({ queryKey: projectKeys.savedAll() });
      }),
    onSettled: () =>
      client.invalidateQueries({ queryKey: projectKeys.savedAll() }),
  });
}
