"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { Profile } from "@/lib/auth/session";
import pig from "../../../public/art/pigxel-mascot-sitting.png";
import { AccountMenu } from "./account-menu";
import {
  BookIcon,
  FolderIcon,
  HomeIcon,
  SparklesIcon,
  TelescopeIcon,
} from "./icons";
import { PatchNotesCard } from "./patch-notes-card";
import { SidebarScene } from "./sidebar-scene";

type NavItem = {
  label: string;
  icon: ReactNode;
  /** Pages that highlight this item; a missing href means it's coming soon. */
  href?: string;
  match?: (path: string) => boolean;
};

const MAIN: NavItem[] = [
  {
    label: "Home",
    icon: <HomeIcon />,
    href: "/home",
    match: (p) => p === "/home",
  },
  {
    label: "My projects",
    icon: <FolderIcon />,
    href: "/tiles",
    match: (p) => p === "/tiles",
  },
  { label: "Explore", icon: <TelescopeIcon /> },
  { label: "AI Studio", icon: <SparklesIcon /> },
  { label: "Tutorials", icon: <BookIcon /> },
];

/**
 * The app’s navigation: logo, pages, a pixel landscape, the latest patch
 * notes and the account (Profile, Settings, Sign out).
 */
export function Sidebar({
  profile,
  onNavigate,
}: {
  profile: Profile;
  /** Called when a link is followed, e.g. to close the mobile menu. */
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const item = (entry: NavItem) => (
    <NavLink
      key={entry.label}
      item={entry}
      path={path}
      onNavigate={onNavigate}
    />
  );

  return (
    <nav
      aria-label="Main"
      className="flex h-full w-60 flex-col bg-linear-to-b from-sidebar to-sidebar-end text-foreground"
    >
      <Link
        href="/home"
        onClick={onNavigate}
        className="mx-5 mt-6 flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <Image src={pig} alt="" width={56} priority className="h-auto" />
        <span className="font-display text-[32px] leading-none font-semibold tracking-tight text-foreground">
          Pigxel
        </span>
      </Link>

      <ul className="mt-7 space-y-1 px-3">{MAIN.map(item)}</ul>

      <SidebarScene />

      <PatchNotesCard
        active={path === "/patch-notes"}
        onNavigate={onNavigate}
      />

      <AccountMenu profile={profile} onNavigate={onNavigate} />
    </nav>
  );
}

function NavLink({
  item,
  path,
  onNavigate,
}: {
  item: NavItem;
  path: string;
  onNavigate?: () => void;
}) {
  const base =
    "flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors";
  if (!item.href)
    return (
      <li>
        <span
          aria-disabled="true"
          className={cn(base, "cursor-default text-foreground/45")}
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Soon
          </span>
        </span>
      </li>
    );
  const active = item.match?.(path) ?? false;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          base,
          "focus-visible:outline-2 focus-visible:outline-offset-2",
          active
            ? "bg-sidebar-accent font-medium text-foreground"
            : "text-foreground/85 hover:bg-white/60",
        )}
      >
        {item.icon}
        {item.label}
      </Link>
    </li>
  );
}
