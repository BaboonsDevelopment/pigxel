import { SIZES, TAGS } from "@/features/explore/constants";

export const SEARCH_MAX = 100;

export function cleanSearch(query: string) {
  return query
    .slice(0, SEARCH_MAX)
    .replace(/[%*,()"\\{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchMatch(query: string): string | null {
  const term = cleanSearch(query);
  if (!term) return null;
  const lower = term.toLowerCase();
  const tags = TAGS.filter((tag) => tag.toLowerCase().includes(lower));
  return [
    `name.ilike.*${term}*`,
    `description.ilike.*${term}*`,
    ...(tags.length ? [`tags.ov.{${tags.join(",")}}`] : []),
  ].join(",");
}

export type ProjectQuery = {
  size?: string;
  animated?: boolean;
  label?: string | null;
  query?: string;
  published?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cloudFilter({
  size,
  animated,
  label,
  query,
  published,
}: ProjectQuery) {
  const range = SIZES.find((s) => s.value === size) ?? SIZES[0];
  return {
    min: range.min,
    max: range.max,
    animated: animated === true,
    label: label && UUID.test(label) ? label : null,
    match: searchMatch(query ?? ""),
    published:
      published === "yes" ? true : published === "no" ? false : undefined,
  };
}
