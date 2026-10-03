"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";

type ProjectMenuItem = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

/** The "⋯" button on a project card and the short list of actions it opens. */
export function ProjectMenu({
  label,
  items,
  disabled,
}: {
  /** Names the menu for screen readers, e.g. "More for house". */
  label: string;
  items: ProjectMenuItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex h-7 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
      >
        <svg aria-hidden="true" viewBox="0 0 16 4" className="w-3.5">
          <rect x="0" y="0.5" width="3" height="3" fill="currentColor" />
          <rect x="6.5" y="0.5" width="3" height="3" fill="currentColor" />
          <rect x="13" y="0.5" width="3" height="3" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 bottom-full z-20 mb-1 min-w-40 rounded-lg border bg-popover p-1 text-sm shadow-lg"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "w-full rounded-md px-3 py-1.5 text-left hover:bg-secondary",
                  item.destructive && "text-destructive",
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
