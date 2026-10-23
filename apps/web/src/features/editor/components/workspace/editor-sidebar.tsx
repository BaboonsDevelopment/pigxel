"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  SIDEBAR_LABELS,
  SIDEBAR_WIDTH,
  type SidebarTab,
} from "../../editor-prefs";
import { Splitter } from "../splitter";

/**
 * The right sidebar: one tab at a time, closed with the icon beside them,
 * at a width dragged from its left edge.
 */
export function EditorSidebar({
  tabs,
  tab,
  onTab,
  onClose,
  width,
  onWidth,
  content,
}: {
  /** The tabs this file offers (Tileset only with a tilemap layer). */
  tabs: SidebarTab[];
  tab: SidebarTab;
  onTab: (tab: SidebarTab) => void;
  onClose: () => void;
  width: number;
  onWidth: (width: number) => void;
  content: Record<SidebarTab, ReactNode>;
}) {
  const shown = tabs.includes(tab) ? tab : tabs[0]!;
  const start = useRef(width);
  return (
    <aside
      aria-label="Sidebar"
      className="relative flex shrink-0 flex-col border-l bg-background"
      style={{ width }}
    >
      <Splitter
        axis="x"
        onStart={() => {
          start.current = width;
          return (delta) =>
            onWidth(
              Math.min(
                SIDEBAR_WIDTH.max,
                Math.max(SIDEBAR_WIDTH.min, start.current - delta),
              ),
            );
        }}
        className="absolute inset-y-0 -left-1 z-10 w-2"
      />
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2">
        <div
          role="tablist"
          aria-label="Sidebar"
          className="flex flex-1 gap-0.5"
        >
          {tabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={shown === id}
              onClick={() => onTab(id)}
              className="h-7 rounded-md px-2.5 text-xs whitespace-nowrap text-[#4a1f35] transition-colors hover:bg-muted aria-selected:bg-[#fde2ea] aria-selected:font-semibold"
            >
              {SIDEBAR_LABELS[id]}
            </button>
          ))}
        </div>
        <SidebarToggle open onClick={onClose} />
      </div>
      {tabs.map((id) => (
        <div
          key={id}
          role="tabpanel"
          hidden={shown !== id}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            id === "assistant" && "flex flex-col overflow-hidden",
          )}
        >
          {content[id]}
        </div>
      ))}
    </aside>
  );
}

/** Opens or closes the right sidebar. */
export function SidebarToggle({
  open,
  onClick,
  className,
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={open ? "Close the sidebar" : "Open the sidebar"}
      title={open ? "Close the sidebar" : "Open the sidebar"}
      onClick={onClick}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
      >
        <rect
          x="2"
          y="2.5"
          width="12"
          height="11"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path d="M10 2.5v11" stroke="currentColor" strokeWidth="1.4" />
        {open && <path d="M11.5 6v4" stroke="currentColor" strokeWidth="1.4" />}
      </svg>
    </button>
  );
}
