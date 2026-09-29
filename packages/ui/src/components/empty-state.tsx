import type { ReactNode } from "react";
import { cn } from "../lib/utils";

/** What a list shows when it has nothing in it yet, with a way forward. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <p className="font-medium">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
