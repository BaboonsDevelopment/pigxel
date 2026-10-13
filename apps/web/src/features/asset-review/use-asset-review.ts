"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POLL_MS, REVIEW_API } from "./constants";
import type {
  ArtAction,
  CommentAction,
  ProductionAsset,
  Reports,
  ReviewSnapshot,
  ReviewStatus,
} from "./types";

const SNAPSHOT_KEY = ["asset-review"];
const PRODUCTION_KEY = ["asset-review", "production"];
const REPORTS_KEY = ["asset-review", "reports"];

async function call<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(REVIEW_API + path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 401) window.location.reload();
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? "Something went wrong.");
  return json as T;
}

export async function enterReviewKey(key: string) {
  await call("/session", "POST", { key });
}

export async function leaveReview() {
  await call("/session", "DELETE");
  window.location.reload();
}

export function useReviewSnapshot() {
  return useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: () => call<ReviewSnapshot>(""),
    refetchInterval: POLL_MS,
  });
}

export function useProduction() {
  return useQuery({
    queryKey: PRODUCTION_KEY,
    queryFn: () => call<ProductionAsset[]>("/production"),
  });
}

export function useReports() {
  const client = useQueryClient();
  const reports = useQuery({
    queryKey: REPORTS_KEY,
    queryFn: () => call<Reports>("/reports"),
  });
  const refresh = () => client.invalidateQueries({ queryKey: REPORTS_KEY });
  return {
    reports,
    resolveArt: async (id: string, action: ArtAction) => {
      await call(`/reports/arts/${id}`, "POST", { action });
      await refresh();
    },
    resolveComment: async (id: string, action: CommentAction) => {
      await call(`/reports/comments/${id}`, "POST", { action });
      await refresh();
    },
  };
}

export function useReviewActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: SNAPSHOT_KEY });
  const after =
    <A extends unknown[]>(action: (...args: A) => Promise<unknown>) =>
    async (...args: A) => {
      await action(...args);
      await refresh();
    };

  return {
    review: after((key: string, status: ReviewStatus, note: string) =>
      call("/review", "POST", { key, status, note }),
    ),
    renameBlock: after((id: string, name: string) =>
      call(`/blocks/${id}`, "PATCH", { name }),
    ),
    setBlockTarget: after((id: string, target: string | null) =>
      call(`/blocks/${id}`, "PATCH", { target }),
    ),
    reject: after((key: string) => call("/reject", "POST", { key })),
    setBlockPremium: after((id: string, premium: boolean) =>
      call(`/blocks/${id}`, "PATCH", { premium }),
    ),
    setTilePremium: after((key: string, premium: boolean) =>
      call("/premium", "POST", { key, premium }),
    ),
    publish: async () => {
      const { output } = await call<{ output: string }>("/publish", "POST");
      await client.invalidateQueries({ queryKey: SNAPSHOT_KEY });
      return output;
    },
    removeFromProduction: async (id: string) => {
      await call(`/production/${id}`, "DELETE");
      await client.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    },
  };
}
