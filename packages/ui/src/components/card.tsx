import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export type CardTone = "pink" | "lavender" | "peach" | "mint" | "muted";
export type CardPadding = "none" | "sm" | "md" | "lg";

const tones: Record<CardTone, string> = {
  pink: "bg-pastel-pink",
  lavender: "bg-pastel-lavender",
  peach: "bg-pastel-peach",
  mint: "bg-pastel-mint",
  muted: "bg-muted/60",
};

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function cardVariants({
  tone,
  padding = "md",
  className,
}: { tone?: CardTone; padding?: CardPadding; className?: string } = {}) {
  return cn(
    "rounded-2xl text-card-foreground",
    tone ? tones[tone] : "border bg-card",
    paddings[padding],
    className,
  );
}

export function Card({
  tone,
  padding,
  className,
  ...props
}: ComponentProps<"div"> & { tone?: CardTone; padding?: CardPadding }) {
  return (
    <div
      data-slot="card"
      className={cardVariants({ tone, padding, className })}
      {...props}
    />
  );
}
