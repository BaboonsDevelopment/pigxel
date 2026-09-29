import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

/** A short line under a control: a hint, an error or a confirmation. */
export function FormMessage({
  tone = "muted",
  className,
  ...props
}: ComponentProps<"p"> & { tone?: "muted" | "error" | "success" }) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "text-sm",
        {
          muted: "text-muted-foreground",
          error: "text-destructive",
          success: "text-success",
        }[tone],
        className,
      )}
      {...props}
    />
  );
}

/** A label, its control, and a hint that an error replaces. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  /** The control the label names; leave out for a group of controls. */
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-slot="field" className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="block">
        {label}
      </Label>
      {children}
      {/* Point the control's aria-describedby at `${htmlFor}-hint`. */}
      {error ? (
        <FormMessage tone="error" id={htmlFor && `${htmlFor}-hint`}>
          {error}
        </FormMessage>
      ) : (
        hint && (
          <FormMessage className="text-xs" id={htmlFor && `${htmlFor}-hint`}>
            {hint}
          </FormMessage>
        )
      )}
    </div>
  );
}
