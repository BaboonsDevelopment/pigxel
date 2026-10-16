"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";

export function HeaderButton({
  label,
  icon,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "group/button relative grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30 aria-expanded:bg-muted aria-expanded:text-foreground",
        className,
      )}
      {...props}
    >
      {icon}
      <span
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-full right-0 z-50 mt-1.5 rounded-md bg-foreground px-2 py-1 text-[11px] font-medium whitespace-nowrap text-background normal-case shadow-md group-hover/button:visible"
      >
        {label}
      </span>
    </button>
  );
}
