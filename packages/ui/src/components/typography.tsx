import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export function PageTitle({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "text-3xl font-semibold tracking-tight break-words text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function SectionTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function Lead({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

export const textLinkClassName =
  "font-medium text-foreground underline underline-offset-4 hover:text-primary";
