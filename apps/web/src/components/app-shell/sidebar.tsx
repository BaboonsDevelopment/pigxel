"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { Profile } from "@/lib/auth/session";
import pig from "../../../public/art/pigxel-mascot-sitting.png";
import {
  BookIcon,
  ChevronRightIcon,
  FolderIcon,
  HomeIcon,
  SettingsIcon,
  SparklesIcon,
  TelescopeIcon,
} from "./icons";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
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
];

const FOOTER: NavItem[] = [
  { label: "Tutorials", icon: <BookIcon /> },
  {
    label: "Settings",
    icon: <SettingsIcon />,
    href: "/settings",
    match: (p) => p === "/settings" || p.startsWith("/settings/"),
  },
];

/** The app’s navigation: logo, pages, a pixel landscape and the account. */
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

      <ul className="space-y-1 px-3 pt-2 pb-3">{FOOTER.map(item)}</ul>

      <Link
        href={profile.username ? `/u/${profile.username}` : "/settings/profile"}
        onClick={onNavigate}
        className="mx-3 mb-4 flex items-center gap-3 rounded-xl border-t border-border px-2 pt-3 pb-1 transition-colors hover:bg-white/50"
      >
        <ProfileAvatar name={profile.name} url={profile.avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {profile.name}
          </span>
          <span className="block text-xs text-muted-foreground">Free plan</span>
        </span>
        <ChevronRightIcon />
      </Link>
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
