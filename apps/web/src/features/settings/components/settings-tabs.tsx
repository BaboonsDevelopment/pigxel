"use client";

import { usePathname } from "next/navigation";
import { TabLinks } from "@/components/ui/tab-links";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/account", label: "Account" },
  { href: "/settings/subscription", label: "Subscription" },
  { href: "/settings/privacy", label: "Privacy" },
];

export function SettingsTabs() {
  const path = usePathname();
  return (
    <TabLinks
      label="Settings"
      className="mt-6"
      tabs={TABS.map((tab) => ({ ...tab, active: path === tab.href }))}
    />
  );
}
