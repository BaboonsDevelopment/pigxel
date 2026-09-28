import { Fredoka, Poppins } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { profileOf, requireUser } from "@/lib/auth/session";

const display = Fredoka({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display",
});
const ui = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
});

/** Signed-in pages (Home, My projects, New tile, Settings) share the sidebar. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className={`${display.variable} ${ui.variable}`}>
      <AppShell profile={profileOf(user)}>{children}</AppShell>
    </div>
  );
}
