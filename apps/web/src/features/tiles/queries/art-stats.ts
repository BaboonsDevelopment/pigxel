"use client";

import { useQuery } from "@tanstack/react-query";
import { loadArtStats } from "../actions";
import { projectKeys } from "./keys";

export function useArtStats(tileId: string | null) {
  return useQuery({
    queryKey: projectKeys.stats(tileId),
    queryFn: () => loadArtStats(tileId ?? undefined),
    staleTime: 0,
  });
}
