import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export type BadgeTone =
  | "neutral"
  | "muted"
  | "overlay"
  | "primary"
  | "accent"
  | "pink"
  | "lavender"
  | "success"
  | "open";
export type BadgeSize = "sm" | "md";

const tones: Record<BadgeTone, string> = {
  neutral: "border bg-background text-foreground",
  muted: "bg-muted text-muted-foreground",
  overlay: "bg-white/85 text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  accent: "bg-primary/10 font-semibold text-primary",
  pink: "bg-pastel-pink-soft text-muted-foreground",
  lavender: "bg-pastel-lavender text-lavender-foreground",
  success: "bg-success/15 text-success",
  open: "border border-success/40 text-success",
};

const sizes: Record<BadgeSize, string> = {
  sm: "font-mono text-[10px] tracking-wide",
  md: "text-xs font-medium",
};

export function Badge({
  tone = "muted",
  size = "sm",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: BadgeTone; size?: BadgeSize }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 whitespace-nowrap",
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
