import {
  ANIMATIONS,
  CANVAS_SIZES,
  DEFAULT_PERIOD,
  FEEDS,
  MAX_TAGS,
  NO_FILTERS,
  PERIODS,
  QUERY_MAX,
  SORTS,
  TAGS,
  type ExploreFilters,
} from "./constants";

export type ExploreParams = {
  period?: string;
  tag?: string;
  size?: string;
  animation?: string;
  mine?: string;
  q?: string;
  sort?: string;
  feed?: string;
};

export function parseExploreParams(
  params: ExploreParams,
  signedIn: boolean,
): ExploreFilters {
  const chosen = params.tag?.split(",") ?? [];
  return {
    tags: TAGS.filter((t) => chosen.includes(t)).slice(0, MAX_TAGS),
    size:
      CANVAS_SIZES.find((s) => s.value === params.size)?.value ??
      NO_FILTERS.size,
    animation:
      ANIMATIONS.find((a) => a.value === params.animation)?.value ??
      NO_FILTERS.animation,
    mine: signedIn && params.mine === "1",
    query: (params.q ?? "").trim().slice(0, QUERY_MAX),
    sort: SORTS.find((s) => s.value === params.sort)?.value ?? NO_FILTERS.sort,
    period:
      PERIODS.find((p) => p.value === params.period)?.value ?? DEFAULT_PERIOD,
    feed: signedIn && params.feed === "following" ? "following" : "all",
  };
}

export function exploreSearchParams(filters: ExploreFilters) {
  const params = new URLSearchParams();
  if (filters.period !== DEFAULT_PERIOD) params.set("period", filters.period);
  if (filters.query) params.set("q", filters.query);
  if (filters.tags.length) params.set("tag", filters.tags.join(","));
  if (filters.size !== NO_FILTERS.size) params.set("size", filters.size);
  if (filters.animation !== NO_FILTERS.animation)
    params.set("animation", filters.animation);
  if (filters.mine) params.set("mine", "1");
  if (filters.sort !== NO_FILTERS.sort) params.set("sort", filters.sort);
  if (filters.feed !== NO_FILTERS.feed) params.set("feed", filters.feed);
  return params;
}

export function isValidFilters(filters: ExploreFilters) {
  return (
    !!filters &&
    PERIODS.some((p) => p.value === filters.period) &&
    CANVAS_SIZES.some((s) => s.value === filters.size) &&
    ANIMATIONS.some((a) => a.value === filters.animation) &&
    typeof filters.mine === "boolean" &&
    typeof filters.query === "string" &&
    SORTS.some((s) => s.value === filters.sort) &&
    FEEDS.some((f) => f.value === filters.feed) &&
    Array.isArray(filters.tags) &&
    filters.tags.length <= MAX_TAGS &&
    filters.tags.every((tag) => (TAGS as readonly string[]).includes(tag))
  );
}

export function artQuery(filters: ExploreFilters, userId: string | null) {
  const range = CANVAS_SIZES.find((s) => s.value === filters.size)!;
  const days =
    filters.sort === "mostLiked"
      ? 0
      : PERIODS.find((p) => p.value === filters.period)!.days;
  return {
    days,
    filter: {
      order:
        filters.sort === "recent" || filters.sort === "az"
          ? filters.sort
          : ("relevance" as const),
      likedBy: filters.mine && userId ? userId : undefined,
      followedBy: filters.feed === "following" && userId ? userId : undefined,
      min: range.min,
      max: range.max,
      animated: filters.animation === "animated",
      still: filters.animation === "still",
      query: filters.query.trim().slice(0, QUERY_MAX),
    },
  };
}

export const countsDiffer = (a: ExploreFilters, b: ExploreFilters) =>
  a.size !== b.size ||
  a.animation !== b.animation ||
  a.query !== b.query ||
  a.period !== b.period ||
  a.sort !== b.sort ||
  a.feed !== b.feed ||
  a.mine !== b.mine;
