"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { HeaderButton } from "./header-button";
import { PANEL_ICONS } from "./icons";
import { MIN_PANEL, PANEL_LABELS, type PanelId } from "../../layout";

export function Panel({
  id,
  title,
  collapsed,
  fill,
  height,
  actions,
  dragging,
  tabs,
  floating = false,
  onDragStart,
  onSelectTab,
  onCollapse,
  onFloat,
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
  tabs?: PanelId[];
  floating?: boolean;
  onDragStart: (id: PanelId, e: PointerEvent<HTMLElement>) => void;
  onSelectTab?: (id: PanelId) => void;
  onCollapse: (collapsed: boolean) => void;
  onFloat: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const grouped = !!tabs && tabs.length > 1;
  return (
    <div
      data-panel={id}
      style={{
        flex: floating
          ? "1 1 0"
          : collapsed
            ? "none"
            : height
              ? `0 0 ${height}px`
              : fill
                ? "1 1 0"
                : "0 1 auto",
        minHeight: collapsed ? undefined : MIN_PANEL,
      }}
      className={cn(
        "flex min-h-0 flex-col transition-opacity",
        dragging && "pointer-events-none opacity-30",
      )}
    >
      {grouped && (
        <div
          role="tablist"
          aria-label="Panels here"
          className="flex shrink-0 items-end gap-0.5 overflow-hidden"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={tab === id}
              title="Click to show · drag to move"
              onPointerDown={(e) => {
                if (e.button === 0) onDragStart(tab, e);
              }}
              onClick={() => onSelectTab?.(tab)}
              className={cn(
                "relative -mb-px h-7 min-w-0 shrink cursor-pointer touch-none truncate rounded-t-md border border-b-0 px-3 text-[11px] font-semibold tracking-wider uppercase transition-colors select-none",
                tab === id
                  ? "z-10 bg-background text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {PANEL_LABELS[tab]}
            </button>
          ))}
        </div>
      )}
      <section
        aria-label={title}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-sm",
          grouped && "rounded-tl-none",
        )}
      >
        <header
          data-panel-header
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
            {grouped ? "" : title}
          </span>
          {!collapsed && actions && (
            <>
              {actions}
              <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
            </>
          )}
          {!floating && (
            <HeaderButton
              label={collapsed ? "Open" : "Fold"}
              icon={collapsed ? PANEL_ICONS.open : PANEL_ICONS.fold}
              onClick={() => onCollapse(!collapsed)}
            />
          )}
          <HeaderButton
            label={floating ? "Dock" : "Float"}
            icon={floating ? PANEL_ICONS.dock : PANEL_ICONS.float}
            onClick={onFloat}
          />
          <HeaderButton
            label="Close · Window brings it back"
            icon={PANEL_ICONS.close}
            onClick={onClose}
          />
        </header>
        {(!collapsed || floating) && (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            {children}
          </div>
        )}
      </section>
    </div>
  );
}
