"use client";

import { useEffect, useRef } from "react";
import { MenuList } from "./components/menu-list";
import type { MenuSections } from "./constants";

/**
 * A right-click menu at the pointer (`x`, `y` in window coordinates), kept
 * inside the window. It closes on a pick, an outside click, Escape, scrolling
 * or resizing.
 */
export function ContextMenu({
  x,
  y,
  sections,
  onClose,
}: {
  x: number;
  y: number;
  sections: MenuSections;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const menu = ref.current;
    if (menu) {
      // Opens up or to the left when there is no room below or to the right.
      const { width, height } = menu.getBoundingClientRect();
      menu.style.left = `${Math.min(x, window.innerWidth - width - 4)}px`;
      menu.style.top = `${Math.min(y, window.innerHeight - height - 4)}px`;
    }
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [x, y, onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 min-w-56 rounded-lg border bg-background p-1 shadow-lg"
    >
      <MenuList sections={sections} onDone={onClose} />
    </div>
  );
}
