import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";

export function ChoiceCard({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="choice-card"
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:bg-primary/5 has-checked:ring-1 has-checked:ring-primary has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:ring-2 has-focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export function ChoiceText({
  title,
  children,
}: {
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <span>
      <span className="block text-sm font-medium">{title}</span>
      {children && (
        <span className="mt-1 block text-sm text-muted-foreground">
          {children}
        </span>
      )}
    </span>
  );
}

export function Radio({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="radio"
      className={cn("mt-0.5 size-4 shrink-0 accent-primary", className)}
      {...props}
    />
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("size-4 shrink-0 accent-primary", className)}
      {...props}
    />
  );
}
