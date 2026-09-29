"use client";

import { useEffect, useRef } from "react";
import { buttonVariants } from "@pigxel/ui/components/button";
import type { MenuItem } from "../constants";

/**
 * A small dropdown built on <details>, closed on selection or an outside
 * click. Its items come in groups, divided by a line.
 */
export function Menu({
  label,
  sections,
  disabled,
}: {
  label: string;
  sections: MenuItem[][];
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
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

  return (
    <details
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && ref.current) ref.current.open = false;
      }}
    >
      <summary
        aria-disabled={disabled}
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className:
            "cursor-pointer list-none gap-1 px-3 text-sm text-foreground [&::-webkit-details-marker]:hidden",
        })}
      >
        {label}
        <span aria-hidden="true" className="text-xs text-muted-foreground">
          ▾
        </span>
      </summary>
      <div
        role="menu"
        className="absolute left-0 z-20 mt-1 min-w-60 rounded-lg border bg-background p-1 shadow-lg"
      >
        {sections.map((items, index) => (
          <div
            key={index}
            role="group"
            className="border-t py-1 first:border-t-0 first:pt-0 last:pb-0"
          >
            {items
              .filter((item) => !item.hidden)
              .map((item) => (
                <MenuButton key={item.label} item={item} onDone={close} />
              ))}
          </div>
        ))}
      </div>
    </details>
  );
}

function MenuButton({ item, onDone }: { item: MenuItem; onDone: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center justify-between gap-6 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
      onClick={() => {
        onDone();
        item.onSelect();
      }}
    >
      {item.label}
      {item.shortcut && (
        <kbd className="font-sans text-xs text-muted-foreground">
          {item.shortcut}
        </kbd>
      )}
    </button>
  );
}
