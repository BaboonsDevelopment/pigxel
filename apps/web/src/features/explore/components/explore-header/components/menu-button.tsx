"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { CheckIcon, ChevronIcon } from "./icons";

export const TRIGGER =
  "flex h-10 min-w-[136px] cursor-pointer items-center gap-2.5 rounded-xl border border-[#e7c6d2] bg-background px-4 text-base text-[#4a2434] transition-colors hover:bg-muted aria-expanded:border-primary [&>svg:first-child]:size-5 [&>svg:last-child]:ml-auto";

export function useDismiss(open: boolean, close: () => void) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open, close]);
  return root;
}

export function MenuButton<Value extends string>({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  options: readonly { value: Value; label: string; icon?: ReactNode }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useDismiss(open, () => setOpen(false));
  const menuId = useId();
  const current = options.find((o) => o.value === value) ?? options[0]!;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`${label}: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        className={TRIGGER}
      >
        {icon}
        {current.label}
        <ChevronIcon />
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute top-full left-0 z-30 mt-2 min-w-48 rounded-xl border bg-popover p-1.5 shadow-lg animate-in fade-in slide-in-from-top-1"
        >
          {options.map((o) => (
            <li key={o.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={o.value === value}
                onClick={() => {
                  setOpen(false);
                  onChange(o.value);
                }}
                className={cn(
                  "flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm whitespace-nowrap transition-colors hover:bg-muted",
                  o.value === value &&
                    "bg-pastel-pink-soft hover:bg-pastel-pink-soft",
                )}
              >
                {o.icon}
                <span className="flex-1">{o.label}</span>
                {o.value === value && (
                  <span className="text-primary">
                    <CheckIcon />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
