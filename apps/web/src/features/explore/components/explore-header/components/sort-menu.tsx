"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { SORTS, type Sort } from "../../../constants";

const ICONS: Record<Sort, ReactNode> = {
  popular: (
    <path d="m8 2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2 4.4 13l.7-4-2.9-2.8 4-.6Z" />
  ),
  recent: (
    <>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 4.8V8l2.2 1.4" />
    </>
  ),
  az: (
    <path d="M4.5 2.5v11M2.5 11.5l2 2 2-2M9 3h4.5l-4.5 5h4.5M9 13l2.2-4.5 2.3 4.5M9.8 11.5h2.9" />
  ),
  liked: (
    <path d="M8 13.5s-5.5-3.3-5.5-7.2A3 3 0 0 1 8 4.6a3 3 0 0 1 5.5 1.7c0 3.9-5.5 7.2-5.5 7.2Z" />
  ),
};

export function SortMenu({
  sort,
  onChange,
}: {
  sort: Sort;
  onChange: (sort: Sort) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = SORTS.find((s) => s.value === sort) ?? SORTS[0];

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
        aria-label={`Sort: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3.5 text-xs transition-colors hover:bg-muted"
      >
        {current.label}
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
          className="absolute top-full left-0 z-20 mt-1 min-w-full rounded-lg border bg-popover p-1 text-xs shadow-lg"
        >
          {SORTS.map((s) => (
            <li key={s.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={s.value === sort}
                onClick={() => {
                  setOpen(false);
                  onChange(s.value);
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  s.value === sort && "bg-pastel-pink-soft text-foreground",
                )}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5 shrink-0"
                >
                  {ICONS[s.value]}
                </svg>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
