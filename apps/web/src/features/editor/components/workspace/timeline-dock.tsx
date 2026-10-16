"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { TIMELINE_HEIGHT } from "../../editor-prefs";
import { Splitter } from "../splitter";

/**
 * Layers and frames below the canvas. Collapsed, it's one bar with the
 * frame count; open, it shows the timeline at a height dragged from its
 * top edge.
 */
export function TimelineDock({
  open,
  height,
  frames,
  onToggle,
  onHeight,
  onAddFrame,
  menus,
  children,
}: {
  open: boolean;
  height: number;
  frames: number;
  onToggle: () => void;
  onHeight: (height: number) => void;
  onAddFrame: () => void;
  /** Layer and Frame menus, beside the timeline they act on. */
  menus: ReactNode;
  children: ReactNode;
}) {
  const start = useRef(height);
  return (
    <section
      aria-label="Timeline"
      className="relative flex shrink-0 flex-col border-t bg-background"
      style={open ? { height } : undefined}
    >
      {open && (
        <Splitter
          axis="y"
          onStart={() => {
            start.current = height;
            return (delta) =>
              onHeight(
                Math.min(
                  TIMELINE_HEIGHT.max,
                  Math.max(TIMELINE_HEIGHT.min, start.current - delta),
                ),
              );
          }}
          className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize"
        />
      )}
      <div className="flex h-9 shrink-0 items-center gap-2.5 px-3 text-sm">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex items-center gap-2.5 rounded-md px-1 py-0.5 hover:bg-muted"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
          >
            <path
              d={open ? "m4 6 4 4 4-4" : "m4 10 4-4 4 4"}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
          >
            <rect
              x="2"
              y="3"
              width="12"
              height="10"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M5 3v10M11 3v10M2 6.5h3M2 9.5h3M11 6.5h3M11 9.5h3"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
          <span className="font-semibold">Timeline</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {frames} {frames === 1 ? "frame" : "frames"}
          </span>
        </button>
        <div className="flex items-center gap-1.5">{menus}</div>
        <span className="ml-auto text-xs text-muted-foreground">
          {frames > 1 ? "Animation" : "Static artwork"}
        </span>
        <button
          type="button"
          aria-label="Add a frame"
          title="Add a frame"
          onClick={onAddFrame}
          className="grid size-7 place-items-center rounded-md text-base text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          +
        </button>
      </div>
      <div className={cn("min-h-0 flex-1", !open && "hidden")}>{children}</div>
    </section>
  );
}
