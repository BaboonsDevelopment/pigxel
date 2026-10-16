"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonVariants } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import { MenuList } from "./components/menu-list";
import type { MenuSections } from "./constants";

/** Room kept clear at the top of the screen, so a menu never covers the header. */
const TOP_CLEARANCE = 64;
const EDGE = 8;
/** Tallest a menu grows before it scrolls. */
const MAX_HEIGHT = 416;
/** Below this much room above, an upward menu opens downward if that's roomier. */
const MIN_UP = 240;

type Place = { up: boolean; maxHeight: number };

/** Which way the menu fits best, and how tall it may be, from its button. */
function placeFrom(button: HTMLElement, preferUp: boolean): Place {
  const box = button.getBoundingClientRect();
  const above = box.top - TOP_CLEARANCE - EDGE;
  const below = window.innerHeight - box.bottom - EDGE;
  const up = preferUp
    ? above >= MIN_UP || above >= below
    : below < 160 && above > below;
  return {
    up,
    maxHeight: Math.max(120, Math.min(MAX_HEIGHT, up ? above : below)),
  };
}

export function Menu({
  label,
  sections,
  disabled,
  up = false,
  icon,
  compact = false,
  align = "left",
}: {
  label: string;
  sections: MenuSections;
  disabled?: boolean;
  /** Open above the button, for menus at the bottom of the screen. */
  up?: boolean;
  /** Show an icon button (labelled for screen readers) instead of the word. */
  icon?: ReactNode;
  /** A small bordered button with a caret, for toolbars. */
  compact?: boolean;
  align?: "left" | "right";
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const opensUp = place?.up ?? up;

  return (
    <details
      ref={ref}
      data-menu={label}
      className="group relative"
      onToggle={(e) => {
        const details = e.currentTarget;
        const summary = details.querySelector("summary");
        setPlace(details.open && summary ? placeFrom(summary, up) : null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && ref.current) ref.current.open = false;
      }}
    >
      <summary
        aria-disabled={disabled}
        aria-label={icon ? label : undefined}
        title={icon ? label : undefined}
        className={
          icon
            ? "grid size-8 cursor-pointer list-none place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
            : compact
              ? "flex h-7 cursor-pointer list-none items-center gap-1 rounded-md border bg-background pr-1.5 pl-2.5 text-xs font-medium text-foreground hover:bg-muted group-open:bg-muted [&::-webkit-details-marker]:hidden"
              : buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className:
                    "cursor-pointer list-none gap-1 px-2 text-sm text-foreground xl:px-3 [&::-webkit-details-marker]:hidden",
                })
        }
      >
        {icon ?? label}
        {compact && !icon && (
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5 text-muted-foreground"
            fill="none"
          >
            <path
              d={up ? "m4.5 10 3.5-3.5 3.5 3.5" : "m4.5 6 3.5 3.5 3.5-3.5"}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </summary>
      <div
        role="menu"
        style={place ? { maxHeight: place.maxHeight } : undefined}
        className={cn(
          "absolute z-30 max-h-[calc(100dvh-4rem)] min-w-60 overflow-y-auto overscroll-contain rounded-lg border bg-background p-1 shadow-lg",
          opensUp ? "bottom-full mb-1" : "mt-1",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        <MenuList sections={sections} onDone={close} />
      </div>
    </details>
  );
}
