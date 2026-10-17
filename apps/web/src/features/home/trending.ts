import "server-only";
import { NO_FILTERS } from "@/features/explore/constants";
import { artQuery } from "@/features/explore/filters";
import type { PublicTile } from "@/features/profile/profile";
import { listPublicTiles } from "@/features/profile/server";

export const TRENDING = 3;

/**
 * The top of Explore as it opens (Popular, this week). A quiet week falls
 * back to all time, so the section is never half empty.
 */
export async function listTrendingWorks(
  viewerId: string,
): Promise<PublicTile[]> {
  const { days, filter } = artQuery(NO_FILTERS, viewerId);
  const week = await listPublicTiles(0, TRENDING, days, viewerId, [], filter);
  if (week.tiles.length >= TRENDING || days === 0) return week.tiles;
  const all = await listPublicTiles(0, TRENDING, 0, viewerId, [], filter);
  return all.tiles;
}
