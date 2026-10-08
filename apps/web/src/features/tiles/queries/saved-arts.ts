"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { setTileSaved } from "@/features/explore/actions";
import type { SavedArt } from "@/features/explore/server";
import { searchSavedArts } from "../actions";
import { projectKeys } from "./keys";

export function useSavedArts(query: string) {
  const result = useQuery({
    queryKey: projectKeys.saved(query),
    queryFn: () => searchSavedArts(query),
    placeholderData: keepPreviousData,
  });
  return {
    arts: result.data ?? [],
    loaded: result.isSuccess && !result.isPlaceholderData,
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
      client.setQueriesData<SavedArt[]>(
        { queryKey: projectKeys.savedAll() },
        (arts) => arts?.filter((saved) => saved.id !== art.id),
      );
    },
    onSettled: () =>
      client.invalidateQueries({ queryKey: projectKeys.savedAll() }),
  });
}
