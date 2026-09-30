import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/lib/auth/session";
import { countUnreadNotifications } from "@/lib/notifications/server";
import { sidebarProfile } from "@/lib/profile/server";

/** Signed-in pages (Home, My projects, New tile, Settings) share the sidebar and top bar. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [profile, unread] = await Promise.all([
    sidebarProfile(user),
    countUnreadNotifications(user.id),
  ]);
  return (
    <AppShell userId={user.id} profile={profile} unreadNotifications={unread}>
      {children}
    </AppShell>
  );
}
