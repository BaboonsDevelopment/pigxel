import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "../lib/utils";

export type HeadingSize = "display" | "page" | "title" | "section" | "small";

const headingSizes: Record<HeadingSize, string> = {
  display: "text-5xl leading-[1.05] sm:text-6xl",
  page: "text-4xl",
  title: "text-2xl",
  section: "text-xl",
  small: "text-lg",
};

const defaultTag: Record<HeadingSize, ElementType> = {
  display: "h1",
  page: "h1",
  title: "h2",
  section: "h2",
  small: "h3",
};

export function Heading({
  size = "section",
  as,
  className,
  ...props
}: ComponentProps<"h2"> & { size?: HeadingSize; as?: ElementType }) {
  const Tag = as ?? defaultTag[size];
  return (
    <Tag
      className={cn(
        "font-display tracking-tight break-words text-foreground",
        headingSizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function PageTitle(props: ComponentProps<"h1">) {
  return <Heading size="page" as="h1" {...props} />;
}

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
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading size="page">{title}</Heading>
        {description && (
          <Text tone="muted" className="mt-1 max-w-2xl">
            {description}
          </Text>
        )}
      </div>
      {actions}
    </div>
  );
}

export function SectionHeader({
  title,
  id,
  actions,
  className,
}: {
  title: ReactNode;
  id?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1",
        className,
      )}
    >
      <Heading id={id}>{title}</Heading>
      {actions}
    </div>
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

export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "font-mono text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}

export type TextSize = "md" | "sm" | "xs";
export type TextTone = "default" | "muted" | "error" | "success";

const textSizes: Record<TextSize, string> = {
  md: "text-base",
  sm: "text-sm",
  xs: "text-xs",
};

const textTones: Record<TextTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  error: "text-destructive",
  success: "text-success",
};

export function Text({
  size = "sm",
  tone = "default",
  as,
  className,
  ...props
}: ComponentProps<"p"> & {
  size?: TextSize;
  tone?: TextTone;
  as?: ElementType;
}) {
  const Tag = as ?? "p";
  return (
    <Tag
      className={cn(textSizes[size], textTones[tone], className)}
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

export type LinkVariant = "inline" | "muted" | "accent";

const linkStyles: Record<LinkVariant, string> = {
  inline:
    "font-medium text-foreground underline underline-offset-4 hover:text-primary",
  muted:
    "text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
  accent: "text-xs font-medium text-link-accent hover:underline",
};

export function linkVariants({
  variant = "inline",
  className,
}: { variant?: LinkVariant; className?: string } = {}) {
  return cn(linkStyles[variant], className);
}

export const textLinkClassName = linkVariants();

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "rounded-md border border-b-2 bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground",
        className,
      )}
      {...props}
    />
  );
}
