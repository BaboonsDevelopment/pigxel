"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";

export function CategoryMenu({
  categories,
  selected,
  counts,
  onToggle,
  className,
}: {
  categories: readonly string[];
  selected: string[];
  counts: Record<string, number> | null;
  onToggle: (name: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label =
    selected.length === 0
      ? categories[0]
      : selected.length === 1
        ? selected[0]
        : `${selected.length} categories`;

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
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={`Category: ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3.5 text-xs transition-colors hover:bg-muted",
          selected.length > 0 && "border-transparent bg-pastel-pink",
        )}
      >
        {label}
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5">
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute top-full left-0 z-20 mt-1 min-w-44 rounded-lg border bg-popover p-1 text-xs shadow-lg"
        >
          {categories.map((name, i) => {
            const checked =
              i === 0 ? selected.length === 0 : selected.includes(name);
            return (
              <li key={name} role="none">
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onClick={() => {
                    onToggle(name);
                    if (i === 0) setOpen(false);
                  }}
                  className={cn(
                    "flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    checked && "bg-pastel-pink-soft text-foreground",
                  )}
                >
                  {name}
                  {counts && (
                    <span className="ml-auto pl-4 tabular-nums">
                      {counts[name] ?? 0}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
