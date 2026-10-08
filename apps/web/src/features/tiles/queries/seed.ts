"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { SavedArt } from "@/features/explore/server";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import type { Label } from "../labels";
import { projectKeys, type ProjectListParams } from "./keys";

export function useSeedProjectCache({
  list,
  recent,
  labels,
  saved,
}: {
  list: {
    params: ProjectListParams;
    page: { tiles: CloudTileSummary[]; count: number };
  };
  recent: CloudTileSummary[] | null;
  labels: Label[];
  saved: { query: string; arts: SavedArt[] };
}) {
  const client = useQueryClient();
  useState(() => {
    void client.invalidateQueries({
      queryKey: projectKeys.all,
      refetchType: "none",
    });
    client.setQueryData(projectKeys.list(list.params), {
      pages: [list.page],
      pageParams: [0],
    });
    if (recent) client.setQueryData(projectKeys.recent(), recent);
    client.setQueryData(projectKeys.labels(), labels);
    client.setQueryData(projectKeys.saved(saved.query), saved.arts);
  });
}
