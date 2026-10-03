"use client";

import { useState, type ReactNode } from "react";
import { ICONS } from "../icons";

export function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 border-r pr-4 last:border-r-0"
    >
      <button
        type="button"
        aria-expanded={open}
        title={
          open
            ? `Hide ${label.toLowerCase()} controls`
            : `Show ${label.toLowerCase()} controls`
        }
        onClick={() => setOpen((o) => !o)}
        className="mr-1 flex h-7 items-center gap-1 rounded-md pr-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase hover:bg-muted hover:text-foreground"
      >
        {open ? ICONS.open : ICONS.closed}
        {label}
      </button>
      {open && children}
    </div>
  );
}
