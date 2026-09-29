import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  /** The main action on a screen: Create, Save, Sign in. */
  primary:
    "bg-primary font-semibold text-primary-foreground shadow-[0_6px_16px_-8px_var(--color-primary)] hover:bg-primary-hover",
  /** Everything else: bordered, quiet. Shows as selected with aria-pressed. */
  secondary:
    "border bg-background text-foreground hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground",
  /** Toolbar and inline actions. */
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  /** Looks like a text link, for actions inside sentences. */
  link: "h-auto px-0 text-foreground underline underline-offset-4 hover:text-primary",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-md px-2.5 text-xs",
  md: "h-9 rounded-lg px-3.5 text-sm",
  lg: "h-11 rounded-xl px-5 text-[15px]",
  icon: "size-8 rounded-md text-sm",
};

/**
 * The classes of a button, for elements that must look like one but aren't
 * a <button>, such as links: `<Link className={buttonVariants()} />`.
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    base,
    variants[variant],
    variant !== "link" && sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "submit",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      data-slot="button"
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
