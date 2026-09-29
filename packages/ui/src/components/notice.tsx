import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * A boxed message at the top of a page or section: an update confirmed, a
 * setup step missing, something that went wrong.
 */
export function Notice({
  tone = "info",
  className,
  ...props
}: ComponentProps<"div"> & { tone?: "info" | "success" | "error" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border p-3 text-sm",
        {
          info: "bg-muted text-foreground",
          success: "border-success/30 bg-success/10 text-success",
          error: "border-destructive/30 bg-destructive/10 text-destructive",
        }[tone],
        className,
      )}
      {...props}
    />
  );
}
