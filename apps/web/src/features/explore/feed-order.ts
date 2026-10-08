import type { ExploreFilters } from "./constants";

const KEY = "pigxel:explore-order";

export type FeedOrder = {
  ids: string[];
  filters: ExploreFilters;
  count: number;
  url: string;
};

export function saveFeedOrder(order: FeedOrder) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {}
}

let cached: { raw: string | null; order: FeedOrder | null } = {
  raw: null,
  order: null,
};

export function readFeedOrder(): FeedOrder | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {}
  if (raw === cached.raw) return cached.order;
  let order: FeedOrder | null = null;
  try {
    order = raw ? (JSON.parse(raw) as FeedOrder) : null;
  } catch {}
  cached = { raw, order };
  return order;
}
