import type { ComponentProps, ReactNode } from "react";
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

/** A page title with an optional description and actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <PageTitle>{title}</PageTitle>
        {description && <Lead className="mt-2">{description}</Lead>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Classes for a text link inside copy. */
export const textLinkClassName =
  "font-medium text-foreground underline underline-offset-4 hover:text-primary";
