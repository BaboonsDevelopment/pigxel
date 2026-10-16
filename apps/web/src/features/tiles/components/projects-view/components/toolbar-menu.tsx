"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { useDismiss } from "@/features/explore/components/explore-header/components/menu-button";

export const TOOLBAR_TRIGGER =
  "flex h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-[#e7c6d2] bg-background px-4 text-base whitespace-nowrap text-[#4a1f35] transition-colors hover:bg-muted aria-expanded:border-[#8c3a57]";

export const TOOLBAR_PANEL =
  "absolute top-full left-0 z-30 mt-2 rounded-xl border bg-popover p-2 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150";

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      <path d={open ? "m4 10 4-4 4 4" : "m4 6 4 4 4-4"} />
    </svg>
  );
}

export function ToolbarMenu<Value extends string>({
  label,
  title,
  icon,
  options,
  value,
  onChange,
}: {
  label: string;
  title?: string;
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
        className={TOOLBAR_TRIGGER}
      >
        {icon}
        {current.label}
        <Chevron open={open} />
      </button>
      {open && (
        <div id={menuId} className={cn(TOOLBAR_PANEL, "min-w-48")}>
          {title && (
            <p className="px-2.5 pt-1 pb-1.5 text-[11px] text-muted-foreground">
              {title}
            </p>
          )}
          <ul role="menu" aria-label={label} className="grid gap-0.5">
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
                    "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] whitespace-nowrap text-[#4a1f35] transition-colors hover:bg-muted",
                    o.value === value && "bg-[#fde2ea] hover:bg-[#fde2ea]",
                  )}
                >
                  {o.icon}
                  <span className="flex-1">{o.label}</span>
                  {o.value === value && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4 text-primary"
                    >
                      <path d="m3.5 8.5 3 3 6-7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
