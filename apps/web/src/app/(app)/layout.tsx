import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/lib/auth/session";
import { sidebarProfile } from "@/lib/profile/server";

/** Signed-in pages (Home, My projects, New tile, Settings) share the sidebar. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return <AppShell profile={await sidebarProfile(user)}>{children}</AppShell>;
}
