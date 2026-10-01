"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { Profile } from "@/lib/auth/session";
import pig from "../../../public/art/pigxel-mascot-sitting.png";
import { CloseIcon, MenuIcon } from "./icons";
import { NotificationBell } from "./notification-bell";
import { SearchButton } from "./search-dialog";
import { TokensButton } from "@/components/tokens-button/tokens-button";
import { Sidebar } from "./sidebar";

/**
 * The signed-in layout: the sidebar on the left, and the page on the right
 * under a top bar with search and notifications.
 * On narrow screens the sidebar becomes a menu that slides in from the left.
 */
export function AppShell({
  userId,
  profile,
  unreadNotifications,
  children,
}: {
  userId: string;
  profile: Profile;
  unreadNotifications: number;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="flex h-dvh bg-canvas">
      {/* Named so page transitions leave the sidebar still. */}
      <div
        className="hidden shrink-0 border-r border-border md:block"
        style={{ viewTransitionName: "app-sidebar" }}
      >
        <Sidebar profile={profile} />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-foreground/30"
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <Sidebar profile={profile} onNavigate={() => setMenuOpen(false)} />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute top-5 -right-12 flex size-10 items-center justify-center rounded-full bg-white text-foreground shadow"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 md:border-0 md:bg-transparent md:px-8">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-white/60 md:hidden"
          >
            <MenuIcon />
          </button>
          <Link href="/home" className="flex items-center gap-2 md:hidden">
            <Image src={pig} alt="" width={30} className="h-auto" />
            <span className="font-display text-xl font-semibold text-foreground">
              Pigxel
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2.5">
            <TokensButton />
            <SearchButton userId={userId} />
            <NotificationBell unread={unreadNotifications} />
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
