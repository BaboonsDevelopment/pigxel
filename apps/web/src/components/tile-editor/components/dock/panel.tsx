"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { PanelId } from "@/lib/editor-layout/layout";

export function Panel({
  id,
  title,
  collapsed,
  fit,
  weight,
  dragging,
  onDragStart,
  onCollapse,
  onClose,
  children,
}: {
  id: PanelId;
  title: string;
  collapsed: boolean;
  fit?: boolean;
  weight: number;
  dragging: boolean;
  onDragStart: (id: PanelId, e: PointerEvent<HTMLElement>) => void;
  onCollapse: (collapsed: boolean) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section
      data-panel={id}
      aria-label={title}
      style={{ flex: collapsed || fit ? "0 1 auto" : `${weight} 1 0` }}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden transition-opacity",
        dragging && "opacity-30",
      )}
    >
      <header
        title="Drag to move this panel"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          onDragStart(id, e);
        }}
        className="flex h-7 shrink-0 cursor-grab touch-none items-center gap-1 bg-muted/40 pr-1 pl-2 select-none active:cursor-grabbing"
      >
        <span className="min-w-0 flex-1 truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </span>
        <button
          type="button"
          aria-label={collapsed ? `Open ${title}` : `Fold ${title}`}
          aria-expanded={!collapsed}
          title={collapsed ? "Open" : "Fold"}
          onClick={() => onCollapse(!collapsed)}
          className="grid size-5 place-items-center rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <button
          type="button"
          aria-label={`Close ${title}`}
          title="Close (Window brings it back)"
          onClick={onClose}
          className="grid size-5 place-items-center rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ×
        </button>
      </header>
      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
      )}
    </section>
  );
}
