"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@pigxel/ui/lib/utils";
import { TAGS } from "../../../constants";

const MENU_MAX = 280;

export function TagPicker({
  value,
  onChange,
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{
    container: Element;
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const menuId = useId();

  const show = () => {
    const trigger = root.current;
    const rect = trigger?.getBoundingClientRect();
    if (!trigger || !rect) return;
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const up = below < MENU_MAX && above > below;
    setPlace({
      container: trigger.closest("dialog") ?? document.body,
      left: rect.left,
      width: rect.width,
      top: up ? rect.top - 4 - Math.min(MENU_MAX, above) : rect.bottom + 4,
      maxHeight: Math.min(MENU_MAX, up ? above : below),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !menu.current?.contains(target))
        setOpen(false);
    };
    const hide = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
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
        onClick={() => (open ? setOpen(false) : show())}
        className={cn(
          "flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-left text-sm transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20",
          className,
        )}
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
      {open &&
        place &&
        createPortal(
          <ul
            ref={menu}
            id={menuId}
            role="menu"
            style={{
              left: place.left,
              top: place.top,
              width: place.width,
              maxHeight: place.maxHeight,
            }}
            className="fixed z-50 overflow-y-auto rounded-lg border bg-popover p-1 text-sm shadow-lg"
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
          </ul>,
          place.container,
        )}
    </div>
  );
}
