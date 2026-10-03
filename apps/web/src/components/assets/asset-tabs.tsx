import Link from "next/link";
import { cn } from "@pigxel/ui/lib/utils";
import { ASSET_CATEGORIES } from "@/lib/assets/assets";

export const ASSET_TABS = [
  { value: "all", label: "All" },
  ...ASSET_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
  { value: "palettes", label: "Palettes" },
] as const;

export type AssetTab = (typeof ASSET_TABS)[number]["value"];

export function AssetTabs({ active }: { active: AssetTab }) {
  return (
    <nav
      aria-label="Kind of asset"
      className="inline-flex max-w-full overflow-x-auto rounded-lg border bg-background shadow-sm"
    >
      {ASSET_TABS.map((tab, i) => (
        <Link
          key={tab.value}
          href={tab.value === "all" ? "/assets" : `/assets?type=${tab.value}`}
          scroll={false}
          aria-current={tab.value === active ? "page" : undefined}
          className={cn(
            "px-4 py-1 font-display text-base tracking-tight whitespace-nowrap transition-colors",
            i > 0 && "border-l",
            tab.value === active
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-muted",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
