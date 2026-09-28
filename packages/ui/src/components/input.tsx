import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-lg border bg-background px-3 text-base outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
