"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/auth/session";
import type { AuthState } from "@/lib/auth/types";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import {
  ChevronRightIcon,
  CrownIcon,
  SettingsIcon,
  SignOutIcon,
  UserIcon,
} from "./icons";

/**
 * The account at the bottom of the sidebar. A click opens a card with who
 * is signed in and Profile, Settings, Upgrade plan and Sign out: beside the sidebar on
 * wide screens, above the account in the phone menu.
 */
export function AccountMenu({
  profile,
  onNavigate,
}: {
  profile: Profile;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(signOut, {} as AuthState);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const profileHref = profile.username
    ? `/u/${profile.username}`
    : "/settings/profile";

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const follow = () => {
    setOpen(false);
    onNavigate?.();
  };
  const item =
    "flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm text-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-2";

  return (
    <div ref={root} className="relative mx-3 mb-4 border-t border-border pt-3">
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute inset-x-0 bottom-full z-50 mb-2 overflow-hidden rounded-2xl border bg-popover shadow-xl md:inset-x-auto md:bottom-0 md:left-full md:mb-0 md:ml-4 md:w-60"
        >
          <div className="flex items-center gap-3 bg-linear-120 from-[#f6e8f0] to-[#efe6f8] px-3 py-3">
            <ProfileAvatar
              name={profile.name}
              url={profile.avatarUrl}
              className="size-10 text-base"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {profile.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {profile.username ? `@${profile.username}` : profile.email}
              </span>
            </span>
          </div>
          <div className="p-1.5">
            <Link
              role="menuitem"
              href={profileHref}
              onClick={follow}
              className={item}
            >
              <UserIcon />
              Your profile
            </Link>
            <Link
              role="menuitem"
              href="/settings"
              onClick={follow}
              className={item}
            >
              <SettingsIcon />
              Settings
            </Link>
            <Link
              role="menuitem"
              href="/pricing"
              onClick={follow}
              className={cn(
                item,
                "font-medium text-primary hover:bg-primary/10 hover:text-primary",
              )}
            >
              <CrownIcon />
              Upgrade plan
            </Link>
          </div>
          <form action={action} className="border-t p-1.5">
            <button
              role="menuitem"
              disabled={pending}
              className={cn(
                item,
                "text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-60",
              )}
            >
              <SignOutIcon />
              {pending ? "Signing out…" : "Sign out"}
            </button>
            {state.error && (
              <p
                role="alert"
                className="px-2.5 pt-1 pb-1 text-xs text-destructive"
              >
                {state.error}
              </p>
            )}
          </form>
        </div>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-white/50",
          open && "bg-white/60",
        )}
      >
        <ProfileAvatar name={profile.name} url={profile.avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {profile.name}
          </span>
          <span className="block text-xs text-muted-foreground">
            {profile.plan ?? "Free"} plan
          </span>
        </span>
        <ChevronRightIcon />
      </button>
    </div>
  );
}
