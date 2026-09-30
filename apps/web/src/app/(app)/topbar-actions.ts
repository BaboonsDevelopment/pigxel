"use server";

import { requireUser } from "@/lib/auth/session";
import {
  listNotifications,
  markNotificationsSeen,
  type AppNotification,
} from "@/lib/notifications/server";
import { search, type SearchResults } from "@/lib/search/server";

/** The bell's list; opening it marks everything as seen. */
export async function openNotifications(): Promise<AppNotification[]> {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  await markNotificationsSeen(user.id);
  return items;
}

export async function searchAll(query: string): Promise<SearchResults> {
  const user = await requireUser();
  if (typeof query !== "string") return { tiles: [], artists: [] };
  return search(user.id, query);
}
