import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** The one h1 of a page. */
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

/** A heading for a part of a page, e.g. "Pinned" or "Email". */
export function SectionTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

/** Supporting text under a title. */
export function Lead({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

/** Classes for a text link inside copy. */
export const textLinkClassName =
  "font-medium text-foreground underline underline-offset-4 hover:text-primary";
