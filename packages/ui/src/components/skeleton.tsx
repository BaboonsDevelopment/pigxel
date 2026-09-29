import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** A pulsing block that stands in for content while it loads. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
