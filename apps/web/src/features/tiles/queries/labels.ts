"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadLabels } from "../actions";
import type { Label } from "../labels";
import { projectKeys } from "./keys";

export function useLabels() {
  return (
    useQuery({
      queryKey: projectKeys.labels(),
      queryFn: () => loadLabels(),
    }).data ?? []
  );
}

export function useSetLabels() {
  const client = useQueryClient();
  return (labels: Label[]) => {
    client.setQueryData(projectKeys.labels(), labels);
    void client.invalidateQueries({ queryKey: projectKeys.labels() });
  };
}
