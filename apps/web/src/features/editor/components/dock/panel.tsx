"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { HeaderButton } from "./header-button";
import { PANEL_ICONS } from "./icons";
import { MIN_PANEL, type PanelId } from "../../layout";

export function Panel({
  id,
  title,
  collapsed,
  fill,
  height,
  actions,
  dragging,
  onDragStart,
  onCollapse,
  onClose,
  children,
}: {
  id: PanelId;
  title: string;
  collapsed: boolean;
  fill?: boolean;
  height?: number;
  actions?: ReactNode;
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
      style={{
        flex: collapsed
          ? "none"
          : height
            ? `0 0 ${height}px`
            : fill
              ? "1 1 0"
              : "0 1 auto",
        minHeight: collapsed ? undefined : MIN_PANEL,
      }}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background shadow-sm transition-opacity",
        dragging && "opacity-30",
      )}
    >
      <header
        title="Drag to move this panel"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          onDragStart(id, e);
        }}
        className={cn(
          "flex h-8 shrink-0 cursor-grab touch-none items-center gap-0.5 pr-1.5 pl-1 select-none active:cursor-grabbing",
          !collapsed && "border-b",
        )}
      >
        <span className="text-muted-foreground/60">{PANEL_ICONS.grip}</span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wider text-foreground/80 uppercase">
          {title}
        </span>
        {!collapsed && actions && (
          <>
            {actions}
            <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
          </>
        )}
        <HeaderButton
          label={collapsed ? "Open" : "Fold"}
          icon={collapsed ? PANEL_ICONS.open : PANEL_ICONS.fold}
          onClick={() => onCollapse(!collapsed)}
        />
        <HeaderButton
          label="Close · Window brings it back"
          icon={PANEL_ICONS.close}
          onClick={onClose}
        />
      </header>
      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
      )}
    </section>
  );
}
