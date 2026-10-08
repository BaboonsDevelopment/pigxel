"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@pigxel/ui/lib/utils";

const ITEM_HEIGHT = 32;
const GAP = 4;

type ProjectMenuItem = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

export function ProjectMenu({
  label,
  items,
  disabled,
  icon,
  placement = "up",
}: {
  label: string;
  items: ProjectMenuItem[];
  disabled?: boolean;
  icon?: ReactNode;
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !menu.current?.contains(target))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const hide = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  const toggle = () => {
    const rect = root.current?.getBoundingClientRect();
    if (!open && rect) {
      const height = items.length * ITEM_HEIGHT + 10;
      const below = window.innerHeight - rect.bottom;
      const up =
        placement === "up"
          ? rect.top >= height + GAP || rect.top > below
          : below < height + GAP && rect.top > below;
      setPlace({
        right: window.innerWidth - rect.right,
        ...(up
          ? { bottom: window.innerHeight - rect.top + GAP }
          : { top: rect.bottom + GAP }),
      });
    }
    setOpen(!open);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={toggle}
        className="flex h-7 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
      >
        {icon ?? (
          <svg aria-hidden="true" viewBox="0 0 16 4" className="w-3.5">
            <rect x="0" y="0.5" width="3" height="3" fill="currentColor" />
            <rect x="6.5" y="0.5" width="3" height="3" fill="currentColor" />
            <rect x="13" y="0.5" width="3" height="3" fill="currentColor" />
          </svg>
        )}
      </button>
      {open &&
        createPortal(
          <ul
            ref={menu}
            id={menuId}
            role="menu"
            style={place}
            className="fixed z-50 min-w-40 rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
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
          </ul>,
          document.body,
        )}
    </div>
  );
}
