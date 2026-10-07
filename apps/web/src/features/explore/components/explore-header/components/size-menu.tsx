"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { SIZES, type Size } from "../../../constants";

export function SizeMenu({
  size,
  onChange,
}: {
  size: Size;
  onChange: (size: Size) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = SIZES.find((s) => s.value === size) ?? SIZES[0];

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
        aria-label={`Canvas size: ${current.label}`}
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
          {SIZES.map((s) => (
            <li key={s.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={s.value === size}
                onClick={() => {
                  setOpen(false);
                  onChange(s.value);
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  s.value === size && "bg-pastel-pink-soft text-foreground",
                )}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
