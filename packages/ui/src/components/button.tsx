import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export const buttonClassName =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

export function Button({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      data-slot="button"
      className={cn(buttonClassName, className)}
      {...props}
    />
  );
}
