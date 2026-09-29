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
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  TelescopeIcon,
} from "./icons";
import { SidebarScene } from "./sidebar-scene";
import { createButtonClass } from "./styles";

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
    href: "/account",
    match: (p) => p === "/account",
  },
];

/** The app's navigation: logo, Create, pages, a pixel landscape and the account. */
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
      className="flex h-full w-60 flex-col bg-[linear-gradient(180deg,#f8eef3_0%,#f4e6ed_100%)] font-[family-name:var(--font-ui)] text-[#3b2c35]"
    >
      <Link
        href="/home"
        onClick={onNavigate}
        className="mx-5 mt-6 flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c65a7e]"
      >
        <Image src={pig} alt="" width={56} priority className="h-auto" />
        <span className="font-[family-name:var(--font-display)] text-[32px] leading-none font-semibold tracking-tight text-[#3b2a33]">
          Pigxel
        </span>
      </Link>

      <Link
        href="/tiles/new"
        onClick={onNavigate}
        className={cn(createButtonClass, "mx-5 mt-7 flex")}
      >
        <PlusIcon />
        Create
      </Link>

      <ul className="mt-6 space-y-1 px-3">{MAIN.map(item)}</ul>

      <SidebarScene />

      <ul className="space-y-1 px-3 pt-2 pb-3">{FOOTER.map(item)}</ul>

      <Link
        href="/account"
        onClick={onNavigate}
        className="mx-3 mb-4 flex items-center gap-3 rounded-xl border-t border-[#ead6df] px-2 pt-3 pb-1 transition-colors hover:bg-white/50"
      >
        <Avatar profile={profile} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {profile.name}
          </span>
          <span className="block text-xs text-[#8b7a84]">Free plan</span>
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
          className={cn(base, "cursor-default text-[#3b2c35]/45")}
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#b0869a] uppercase">
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
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c65a7e]",
          active
            ? "bg-[#f6dbe5] font-medium text-[#3b2a33]"
            : "text-[#4a3d45] hover:bg-white/60",
        )}
      >
        {item.icon}
        {item.label}
      </Link>
    </li>
  );
}

function Avatar({ profile }: { profile: Profile }) {
  if (profile.avatarUrl)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from the sign-in provider
      <img
        src={profile.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="size-9 shrink-0 rounded-full object-cover"
      />
    );
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e9c2d2] text-sm font-semibold text-[#8a3d5c]">
      {profile.name.charAt(0).toUpperCase()}
    </span>
  );
}
