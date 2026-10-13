import type { ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { madimiOne, PROFILE_HEADING } from "@/lib/fonts/madimi";

export function ProfileSectionHeader({
  id,
  title,
  count,
  action,
}: {
  id: string;
  title: string;
  count: number;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <h2
        id={id}
        className={cn(madimiOne.className, PROFILE_HEADING, "text-[32px]")}
      >
        {title}
      </h2>
      <span className="flex h-8 min-w-8 items-center justify-center rounded-full border bg-white px-2 text-xs text-foreground tabular-nums shadow-sm">
        {count}
      </span>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
