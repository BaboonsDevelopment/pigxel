"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ActivityButton({ children }: { children: ReactNode }) {
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{
    top: number;
    right: number;
    maxWidth: number;
  } | null>(null);

  const toggle = () => {
    if (place) return setPlace(null);
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const right = Math.max(8, window.innerWidth - rect.right);
    setPlace({
      top: rect.bottom + 8,
      right,
      maxWidth: window.innerWidth - right - 8,
    });
  };

  useEffect(() => {
    if (!place) return;
    const close = () => setPlace(null);
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target))
        close();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const scroll = (e: Event) => {
      if (!panel.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("resize", close);
    window.addEventListener("scroll", scroll, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", scroll, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [place]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="Daily activity"
        aria-expanded={place !== null}
        onClick={toggle}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border bg-background text-foreground transition-colors hover:bg-muted aria-expanded:bg-muted"
      >
        <ActivityIcon />
      </button>
      {place &&
        createPortal(
          <div
            ref={panel}
            style={{
              top: place.top,
              right: place.right,
              maxWidth: place.maxWidth,
            }}
            className="fixed z-50 animate-in duration-150 fade-in slide-in-from-top-1"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

function ActivityIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="size-[18px]"
    >
      <rect x="2" y="2" width="3" height="3" rx="0.6" opacity="0.35" />
      <rect x="6.5" y="2" width="3" height="3" rx="0.6" />
      <rect x="11" y="2" width="3" height="3" rx="0.6" opacity="0.6" />
      <rect x="2" y="6.5" width="3" height="3" rx="0.6" />
      <rect x="6.5" y="6.5" width="3" height="3" rx="0.6" opacity="0.35" />
      <rect x="11" y="6.5" width="3" height="3" rx="0.6" />
      <rect x="2" y="11" width="3" height="3" rx="0.6" opacity="0.6" />
      <rect x="6.5" y="11" width="3" height="3" rx="0.6" />
      <rect x="11" y="11" width="3" height="3" rx="0.6" opacity="0.35" />
    </svg>
  );
}
