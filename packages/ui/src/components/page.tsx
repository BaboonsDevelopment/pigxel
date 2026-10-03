import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export function Page({
  width = "wide",
  className,
  ...props
}: ComponentProps<"main"> & { width?: "wide" | "narrow" }) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-6 pt-6 pb-10 md:px-10 md:pt-2",
        width === "wide" ? "max-w-5xl" : "max-w-2xl",
        className,
      )}
      {...props}
    />
  );
}
