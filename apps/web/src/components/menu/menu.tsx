"use client";

import { useEffect, useRef } from "react";
import { buttonVariants } from "@pigxel/ui/components/button";
import { MenuList } from "./components/menu-list";
import type { MenuSections } from "./constants";

/** A small dropdown built on <details>, closed on selection or an outside click. */
export function Menu({
  label,
  sections,
  disabled,
}: {
  label: string;
  sections: MenuSections;
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
      data-menu={label}
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
        className="absolute left-0 z-30 mt-1 max-h-[calc(100dvh-4rem)] min-w-60 overflow-y-auto rounded-lg border bg-background p-1 shadow-lg"
      >
        <MenuList sections={sections} onDone={close} />
      </div>
    </details>
  );
}
