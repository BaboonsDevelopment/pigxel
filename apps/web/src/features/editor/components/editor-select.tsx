"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@pigxel/ui/lib/utils";

type Option = { value: string; label: string; disabled?: boolean };

export function EditorSelect({
  value,
  options,
  onChange,
  className,
  id,
  title,
  disabled,
  ariaLabel,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  title?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 160,
    maxHeight: 240,
  });
  // Inside a modal dialog the list must render in it to stay clickable.
  const [container, setContainer] = useState<Element | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  const show = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    setContainer(trigger.current?.closest("dialog") ?? document.body);
    const width = Math.max(160, rect.width);
    const height = Math.min(240, options.length * 36 + 8);
    const above =
      window.innerHeight - rect.bottom < height + 8 &&
      rect.top > window.innerHeight - rect.bottom;
    setPosition({
      left: Math.max(4, Math.min(rect.left, window.innerWidth - width - 4)),
      top: above ? Math.max(4, rect.top - height - 4) : rect.bottom + 4,
      width,
      maxHeight: Math.max(
        40,
        above ? rect.top - 8 : window.innerHeight - rect.bottom - 8,
      ),
    });
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    );
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !trigger.current?.contains(target) &&
        !popup.current?.contains(target)
      )
        setOpen(false);
    };
    const close = () => setOpen(false);
    const outsideFocus = (event: FocusEvent) => {
      const target = event.target as Node;
      if (
        !trigger.current?.contains(target) &&
        !popup.current?.contains(target)
      )
        close();
    };
    const outsideScroll = (event: Event) => {
      if (!popup.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outsideFocus);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", outsideScroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outsideFocus);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", outsideScroll, true);
    };
  }, [open]);

  const choose = (option: Option) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  };

  const move = (step: number) => {
    if (!options.length) return;
    if (!open) show();
    setActive((current) => {
      const base = open
        ? current
        : Math.max(
            0,
            options.findIndex((option) => option.value === value),
          );
      for (let at = 1; at <= options.length; at++) {
        const next = (base + step * at + options.length * at) % options.length;
        if (!options[next]?.disabled) return next;
      }
      return current;
    });
  };

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        title={title}
        disabled={disabled}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            move(event.key === "ArrowDown" ? 1 : -1);
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            const option = options[active];
            if (option) choose(option);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
        className={cn(
          "flex h-8 min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-2 text-left text-sm text-foreground hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:opacity-50",
          className,
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? value}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="size-3 shrink-0 text-muted-foreground"
          fill="none"
        >
          <path
            d="m2.5 4.5 3.5 3 3.5-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open &&
        container &&
        createPortal(
          <div
            ref={popup}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className="fixed z-[100] overflow-y-auto rounded-lg border border-input bg-background p-1 shadow-lg"
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(option)}
                className={cn(
                  "flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm hover:bg-muted disabled:opacity-40",
                  index === active && "bg-muted",
                  option.value === value && "font-medium text-primary",
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === value && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>,
          container,
        )}
    </>
  );
}
