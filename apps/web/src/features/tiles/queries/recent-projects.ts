"use client";

import { useQuery } from "@tanstack/react-query";
import { loadRecentlyOpened } from "../actions";
import { projectKeys } from "./keys";

export function useRecentProjects() {
  return (
    useQuery({
      queryKey: projectKeys.recent(),
      queryFn: () => loadRecentlyOpened(),
    }).data ?? []
  );
}
