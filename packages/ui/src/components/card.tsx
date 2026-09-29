import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** A bordered panel that groups related content. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border bg-card p-5 text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}
