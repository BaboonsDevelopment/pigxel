"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { MenuItem, MenuSections } from "../constants";

const ITEM =
  "flex w-full items-center justify-between gap-6 rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

export function MenuList({
  sections,
  onDone,
}: {
  sections: MenuSections;
  onDone: () => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const openOnly = (label: string | null) => {
    if (timer.current) window.clearTimeout(timer.current);
    setActive(label);
  };
  const closeSoon = (label: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setActive((open) => (open === label ? null : open)),
      150,
    );
  };

  return sections
    .map((items) => items.filter((item) => !item.hidden))
    .filter((items) => items.length > 0)
    .map((items, index) => (
      <div
        key={index}
        role="group"
        className="border-t py-1 first:border-t-0 first:pt-0 last:pb-0"
      >
        {items.map((item, position) =>
          item.submenu ? (
            <Submenu
              key={item.label}
              item={item}
              open={active === item.label}
              onOpen={(open) => openOnly(open ? item.label : null)}
              onLeave={() => closeSoon(item.label)}
              onDone={onDone}
            />
          ) : (
            <button
              key={`${position}:${item.label}`}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={ITEM}
              onPointerEnter={() => openOnly(null)}
              onClick={() => {
                onDone();
                item.onSelect?.();
              }}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {item.icon}
                <span className="truncate">{item.label}</span>
              </span>
              {item.shortcut && (
                <kbd className="font-sans text-xs text-muted-foreground">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ),
        )}
      </div>
    ));
}

function Submenu({
  item,
  open,
  onOpen,
  onLeave,
  onDone,
}: {
  item: MenuItem;
  open: boolean;
  onOpen: (open: boolean) => void;
  onLeave: () => void;
  onDone: () => void;
}) {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const show = (focus = false) => {
    onOpen(true);
    if (focus)
      requestAnimationFrame(() =>
        list.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus(),
      );
  };

  useLayoutEffect(() => {
    if (!open || !button.current || !list.current) return;
    const from = button.current.getBoundingClientRect();
    const size = list.current.getBoundingClientRect();
    const right = from.right + 4 + size.width <= window.innerWidth;
    setAt({
      left: right ? from.right + 4 : Math.max(4, from.left - 4 - size.width),
      top: Math.max(
        4,
        Math.min(from.top - 5, window.innerHeight - size.height - 4),
      ),
    });
  }, [open]);

  return (
    <div onPointerEnter={() => show()} onPointerLeave={onLeave}>
      <button
        ref={button}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={item.disabled}
        className={cn(ITEM, open && "bg-muted")}
        onClick={() => (open ? onOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "Enter") {
            e.preventDefault();
            show(true);
          }
        }}
      >
        {item.label}
        <span aria-hidden="true" className="text-xs text-muted-foreground">
          ▸
        </span>
      </button>
      {open && (
        <div
          ref={list}
          role="menu"
          aria-label={item.label}
          style={at ?? { visibility: "hidden" }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onOpen(false);
              button.current?.focus();
            }
          }}
          className="fixed z-40 max-h-[calc(100dvh-1rem)] min-w-52 overflow-y-auto rounded-lg border bg-background p-1 shadow-lg"
        >
          <MenuList sections={item.submenu!} onDone={onDone} />
        </div>
      )}
    </div>
  );
}
