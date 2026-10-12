import type { ComponentProps } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { manrope } from "@/lib/fonts/manrope";

type ModalButtonVariant = "primary" | "secondary";

export const modalButton = (
  variant: ModalButtonVariant = "primary",
  className?: string,
) =>
  cn(
    manrope.className,
    "inline-flex h-12 items-center justify-center rounded-xl px-6 text-base leading-none font-bold transition-colors disabled:cursor-default disabled:opacity-50",
    variant === "primary"
      ? "bg-pink-strong text-white hover:bg-pink-strong-hover"
      : "border border-primary-soft/70 bg-background text-pink-strong hover:bg-pink-base",
    className,
  );

export function ModalButton({
  variant,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ModalButtonVariant }) {
  return (
    <button
      type={type}
      className={modalButton(variant, className)}
      {...props}
    />
  );
}
