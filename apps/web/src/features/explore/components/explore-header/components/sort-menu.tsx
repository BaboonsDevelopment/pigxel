"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { SIZES, SORTS, type Size, type Sort } from "../../../constants";

const ICONS: Record<Sort, ReactNode> = {
  popular: (
    <path d="m8 2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.2 4.4 13l.7-4-2.9-2.8 4-.6Z" />
  ),
  recent: (
    <>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M8 4.8V8l2.2 1.4" />
    </>
  ),
  az: (
    <path d="M4.5 2.5v11M2.5 11.5l2 2 2-2M9 3h4.5l-4.5 5h4.5M9 13l2.2-4.5 2.3 4.5M9.8 11.5h2.9" />
  ),
  liked: (
    <path d="M8 13.5s-5.5-3.3-5.5-7.2A3 3 0 0 1 8 4.6a3 3 0 0 1 5.5 1.7c0 3.9-5.5 7.2-5.5 7.2Z" />
  ),
};

const ITEM =
  "flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      {children}
    </svg>
  );
}

export function SortMenu({
  sort,
  onChange,
  size,
  onSizeChange,
  animated,
  onAnimatedChange,
}: {
  sort: Sort;
  onChange: (sort: Sort) => void;
  size: Size;
  onSizeChange: (size: Size) => void;
  animated: boolean;
  onAnimatedChange: (animated: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sizesOpen, setSizesOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const sizesId = useId();
  const current = SORTS.find((s) => s.value === sort) ?? SORTS[0];
  const currentSize = SIZES.find((s) => s.value === size) ?? SIZES[0];
  const active = Number(size !== SIZES[0].value) + Number(animated);

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

  const toggle = () => {
    setSizesOpen(false);
    setOpen(!open);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={`Sort and filter: ${current.label}${active ? `, ${active} filter${active > 1 ? "s" : ""} on` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3.5 text-xs transition-colors hover:bg-muted"
      >
        {current.label}
        {active > 0 && (
          <span
            aria-hidden="true"
            className="flex size-4 items-center justify-center rounded-full bg-pastel-pink text-[10px] font-semibold tabular-nums animate-in zoom-in-50"
          >
            {active}
          </span>
        )}
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
          className="absolute top-full left-0 z-20 mt-1 min-w-full rounded-lg border bg-popover p-1 text-xs shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {SORTS.map((s) => (
            <li key={s.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={s.value === sort}
                onPointerEnter={() => setSizesOpen(false)}
                onClick={() => {
                  setOpen(false);
                  onChange(s.value);
                }}
                className={cn(
                  ITEM,
                  s.value === sort && "bg-pastel-pink-soft text-foreground",
                )}
              >
                <Icon>{ICONS[s.value]}</Icon>
                {s.label}
              </button>
            </li>
          ))}
          <li role="separator" className="my-1 border-t" />
          <li
            role="none"
            className="relative"
            onPointerEnter={() => setSizesOpen(true)}
            onPointerLeave={() => setSizesOpen(false)}
          >
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={sizesOpen}
              aria-controls={sizesOpen ? sizesId : undefined}
              onClick={() => setSizesOpen(!sizesOpen)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setSizesOpen(true);
                if (e.key === "ArrowLeft") setSizesOpen(false);
              }}
              className={cn(
                ITEM,
                (sizesOpen || size !== SIZES[0].value) && "text-foreground",
                sizesOpen && "bg-secondary",
              )}
            >
              <Icon>
                <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
                <path d="M2.5 8h11M8 2.5v11" />
              </Icon>
              Size
              <span className="ml-auto pl-4 text-muted-foreground">
                {currentSize.label}
              </span>
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3">
                <path
                  d="m6 4 4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {sizesOpen && (
              <div className="absolute top-0 left-full z-30 -mt-1 pl-1.5">
                <ul
                  id={sizesId}
                  role="menu"
                  aria-label="Canvas size"
                  className="min-w-28 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in slide-in-from-left-1 duration-150"
                >
                  {SIZES.map((s) => (
                    <li key={s.value} role="none">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={s.value === size}
                        onClick={() => {
                          setOpen(false);
                          onSizeChange(s.value);
                        }}
                        className={cn(
                          ITEM,
                          "tabular-nums",
                          s.value === size &&
                            "bg-pastel-pink-soft text-foreground",
                        )}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={animated}
              onPointerEnter={() => setSizesOpen(false)}
              onClick={() => {
                setOpen(false);
                onAnimatedChange(!animated);
              }}
              className={cn(ITEM, animated && "text-foreground")}
            >
              <Icon>
                <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
                <path d="M6.75 6v4l3.5-2z" fill="currentColor" />
              </Icon>
              Animated only
              <span
                aria-hidden="true"
                className={cn(
                  "ml-auto flex size-3.5 items-center justify-center rounded-sm border transition-colors",
                  animated &&
                    "border-transparent bg-primary text-primary-foreground",
                )}
              >
                {animated && (
                  <svg viewBox="0 0 16 16" className="size-3">
                    <path
                      d="m3.5 8.5 3 3 6-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
