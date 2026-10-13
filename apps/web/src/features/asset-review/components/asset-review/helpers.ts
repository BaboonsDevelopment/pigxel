import type { ReviewClip, ReviewTile } from "../../types";
import {
  FILTERS,
  REVIEW_PATH,
  VIEWS,
  type Filter,
  type View,
} from "./constants";

export const parseView = (value: unknown): View =>
  VIEWS.find((v) => v.id === value)?.id ?? "review";

export const parseFilter = (value: unknown): Filter =>
  FILTERS.find((f) => f.id === value)?.id ?? "todo";

export function reviewHref(view: View, filter: Filter = "todo") {
  const params = new URLSearchParams();
  if (view !== "review") params.set("view", view);
  if (filter !== "todo") params.set("filter", filter);
  const query = params.toString();
  return query ? `${REVIEW_PATH}?${query}` : REVIEW_PATH;
}

export function matchesFilter(tile: ReviewTile, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "blocked") return tile.blocked;
  if (filter === "todo")
    return (
      !tile.blocked && (tile.state === "pending" || tile.state === "changed")
    );
  return tile.state === filter;
}

export const isPublishable = (tile: ReviewTile) =>
  tile.state === "approved" && !tile.blocked;

export function clipOrder(clip: ReviewClip) {
  const order: number[] = [];
  for (let i = clip.from; i <= clip.to; i++) order.push(i);
  if (clip.direction === "pingpong")
    for (let i = clip.to - 1; i > clip.from; i--) order.push(i);
  return order;
}

export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
