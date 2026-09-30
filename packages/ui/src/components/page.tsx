import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * The <main> of a signed-in page, with the shared width and padding (little
 * at the top on wide screens, where it sits right under the top bar):
 * "wide" for galleries and lists, "narrow" for forms and settings.
 */
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
