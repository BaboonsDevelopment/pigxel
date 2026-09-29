"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@pigxel/ui/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/subscription", label: "Subscription" },
  { href: "/settings/privacy", label: "Privacy" },
];

export function SettingsTabs() {
  const path = usePathname();
  return (
    <nav
      aria-label="Settings"
      className="mt-6 flex gap-1 overflow-x-auto border-b"
    >
      {TABS.map((tab) => {
        const active = path === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
