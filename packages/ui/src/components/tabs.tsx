import { cn } from "../lib/utils";

export type TabsVariant = "underline" | "segmented";
export type TabsSize = "sm" | "md";

export function tabListVariants({
  variant = "underline",
  className,
}: { variant?: TabsVariant; className?: string } = {}) {
  return cn(
    variant === "underline"
      ? "flex gap-1 overflow-x-auto border-b"
      : "relative inline-flex max-w-full overflow-x-auto rounded-lg border bg-background shadow-sm",
    className,
  );
}

export function tabVariants({
  variant = "underline",
  size = "md",
  active,
  highlighted = false,
  className,
}: {
  variant?: TabsVariant;
  size?: TabsSize;
  active: boolean;
  highlighted?: boolean;
  className?: string;
}) {
  if (variant === "underline")
    return cn(
      "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
      active
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
      className,
    );
  return cn(
    "relative whitespace-nowrap transition-colors duration-300 not-first:border-l",
    size === "md"
      ? "px-4 py-1 font-display text-base tracking-tight"
      : "px-2.5 py-0.5 text-sm",
    active
      ? cn("text-primary-foreground", !highlighted && "bg-primary")
      : "text-foreground hover:bg-muted",
    className,
  );
}
