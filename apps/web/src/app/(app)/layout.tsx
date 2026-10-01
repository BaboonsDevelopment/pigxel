import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { PublicHeader } from "@/components/public-header";
import { getUser } from "@/lib/auth/session";
import { countUnreadNotifications } from "@/lib/notifications/server";
import { sidebarProfile } from "@/lib/profile/server";

/**
 * Signed-in pages (Home, My projects, New tile, Settings) share the sidebar
 * and top bar. Explore is open to guests too; they get the public header
 * instead (the proxy keeps them out of the rest).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user)
    return (
      <div className="flex h-dvh flex-col bg-canvas">
        <PublicHeader />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    );
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
