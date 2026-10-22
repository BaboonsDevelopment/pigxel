"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IDLE_POLL_MS, TESTS_API, TESTS_POLL_MS } from "./constants";
import type { SuiteId, TestsSnapshot } from "./types";

const SNAPSHOT_KEY = ["test-runs"];

async function call<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(TESTS_API + path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) window.location.reload();
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? "Something went wrong.");
  return json as T;
}

export function useTestRuns() {
  const client = useQueryClient();
  const snapshot = useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: () => call<TestsSnapshot>(""),
    // Fast while a run streams its log, slow otherwise.
    refetchInterval: (query) =>
      query.state.data?.run ? TESTS_POLL_MS : IDLE_POLL_MS,
  });
  const refresh = () => client.invalidateQueries({ queryKey: SNAPSHOT_KEY });
  return {
    snapshot,
    start: async (suite: SuiteId) => {
      try {
        await call("/run", "POST", { suite });
      } finally {
        await refresh();
      }
    },
    stop: async () => {
      try {
        await call("/run", "DELETE");
      } finally {
        await refresh();
      }
    },
  };
}
