"use client";

import { useQuery } from "@tanstack/react-query";
import { loadArtStats, loadProfileStats } from "../actions";
import { projectKeys } from "./keys";

export function useArtStats(tileId: string | null, profileId?: string) {
  return useQuery({
    queryKey: profileId
      ? projectKeys.profileStats(profileId)
      : projectKeys.stats(tileId),
    queryFn: () =>
      profileId
        ? loadProfileStats(profileId)
        : loadArtStats(tileId ?? undefined),
    staleTime: 0,
  });
}
