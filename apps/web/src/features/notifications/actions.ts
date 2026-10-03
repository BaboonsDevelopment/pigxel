"use server";

import { requireUser } from "@/lib/auth/session";
import {
  listNotifications,
  markNotificationsSeen,
  type AppNotification,
} from "./server";

export async function openNotifications(): Promise<AppNotification[]> {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  await markNotificationsSeen(user.id);
  return items;
}
