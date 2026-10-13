import Link from "next/link";
import { cn } from "@pigxel/ui/lib/utils";
import { StatsHover } from "@/features/tiles/components/projects-view/components/stats-hover";
import { PROFILE_TABS, tabHref, type ProfileTabId } from "../tabs";

export function ProfileTabs({
  profileId,
  username,
  active,
  isOwner,
  withCollections,
}: {
  profileId: string;
  username: string;
  active: ProfileTabId;
  isOwner: boolean;
  withCollections: boolean;
}) {
  const tabs = PROFILE_TABS.filter(
    (tab) =>
      !("hidden" in tab) &&
      (isOwner || !("ownerOnly" in tab)) &&
      (tab.id !== "collections" || withCollections),
  );
  return (
    <nav
      aria-label="Profile sections"
      className="mt-8 flex flex-wrap items-center gap-3"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tabHref(username, tab.id)}
          scroll={false}
          aria-current={tab.id === active ? "page" : undefined}
          className={cn(
            "flex h-8 items-center rounded-lg border bg-background px-4 text-xs transition-colors hover:bg-muted",
            tab.id === active &&
              "border-transparent bg-pastel-pink font-medium text-primary-soft-foreground hover:bg-pastel-pink",
          )}
        >
          {tab.label}
        </Link>
      ))}
      <span className="ml-auto">
        <StatsHover tile={null} profileId={profileId} />
      </span>
    </nav>
  );
}
