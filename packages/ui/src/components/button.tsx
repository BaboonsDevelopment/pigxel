import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary font-semibold text-primary-foreground shadow-[0_6px_16px_-8px_var(--color-primary)] hover:bg-primary-hover",
  secondary:
    "border bg-background text-foreground hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  link: "h-auto px-0 text-foreground underline underline-offset-4 hover:text-primary",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-md px-2.5 text-xs",
  md: "h-9 rounded-lg px-3.5 text-sm",
  lg: "h-11 rounded-xl px-5 text-[15px]",
  icon: "size-8 rounded-md text-sm",
};

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

export type IconButtonVariant = "ghost" | "secondary" | "overlay";
export type IconButtonSize = "xs" | "sm" | "md";

const iconVariants: Record<IconButtonVariant, string> = {
  ghost:
    "text-muted-foreground hover:bg-muted hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground",
  secondary:
    "border bg-background text-foreground hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground",
  overlay: "border bg-white/80 text-foreground shadow-sm hover:bg-white",
};

const iconSizes: Record<IconButtonSize, string> = {
  xs: "size-5 rounded text-sm",
  sm: "size-8 rounded-md text-sm",
  md: "size-10 rounded-lg",
};

export function IconButton({
  label,
  variant = "ghost",
  size = "sm",
  round = false,
  className,
  type = "button",
  title,
  ...props
}: Omit<ComponentProps<"button">, "aria-label"> & {
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  round?: boolean;
}) {
  return (
    <button
      data-slot="icon-button"
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn(
        base,
        iconVariants[variant],
        iconSizes[size],
        round && "rounded-full",
        className,
      )}
      {...props}
    />
  );
}
