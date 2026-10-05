"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { TAGS } from "../../../constants";

export function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
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
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open]);

  const toggle = (tag: string) =>
    onChange(
      value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag],
    );

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        className="flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-left text-sm transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
      >
        {value.length ? (
          value.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-pastel-pink-soft px-2 py-0.5 text-xs text-primary"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="px-0.5 text-muted-foreground">Choose tags</span>
        )}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="ml-auto size-3.5 shrink-0"
        >
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
          className="absolute top-full right-0 left-0 z-20 mt-1 rounded-lg border bg-popover p-1 text-sm shadow-lg"
        >
          {TAGS.map((tag) => {
            const checked = value.includes(tag);
            return (
              <li key={tag} role="none">
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onClick={() => toggle(tag)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left hover:bg-secondary",
                    checked && "text-primary",
                  )}
                >
                  {tag}
                  {checked && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3.5"
                    >
                      <path d="m3.5 8.5 3 3 6-7" />
                    </svg>
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
