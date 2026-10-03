"use client";

import type { ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { LayerPatch } from "@/components/pixel-canvas/use-sprite";
import type { PanelRow } from "@/lib/layers/tree";
import { LAYER_COLUMN, type DropZone } from "../constants";
import { ICONS } from "../icons";

type Props = {
  row: PanelRow;
  active: boolean;
  drop: DropZone | null;
  renaming: boolean;
  onRenamingChange: (renaming: boolean) => void;
  onSelect: () => void;
  onChange: (patch: LayerPatch) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  children: ReactNode;
};

const toggle =
  "flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground";

export function LayerRow({
  row,
  active,
  drop,
  renaming,
  onRenamingChange,
  onSelect,
  onChange,
  onContextMenu,
  children,
  ...drag
}: Props) {
  const { layer, depth } = row;
  const movable = layer.kind !== "background";

  const rename = (name: string) => {
    onRenamingChange(false);
    if (name.trim() && name !== layer.name) onChange({ name: name.trim() });
  };

  return (
    <li
      onDragOver={drag.onDragOver}
      onDragLeave={drag.onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        drag.onDrop();
      }}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={cn(
        "group/row relative flex h-8 cursor-default border-b text-sm select-none",
        active
          ? "bg-[color-mix(in_oklab,var(--color-primary)_10%,var(--color-background))]"
          : "bg-background hover:bg-muted",
        !layer.visible && "text-muted-foreground",
        drop === "above" && "shadow-[inset_0_2px_0_var(--color-primary)]",
        drop === "below" && "shadow-[inset_0_-2px_0_var(--color-primary)]",
        drop === "into" && "ring-2 ring-primary ring-inset",
      )}
    >
      <div
        draggable={movable && !renaming}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          drag.onDragStart();
        }}
        onDragEnd={drag.onDragEnd}
        className={cn(
          "sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r bg-inherit pr-2",
          LAYER_COLUMN,
        )}
      >
        <button
          type="button"
          title={layer.visible ? "Hide layer" : "Show layer"}
          aria-pressed={layer.visible}
          className={toggle}
          onClick={(e) => {
            e.stopPropagation();
            onChange({ visible: !layer.visible });
          }}
        >
          {layer.visible ? ICONS.shown : ICONS.hidden}
        </button>
        <button
          type="button"
          title={layer.locked ? "Unlock layer" : "Lock layer"}
          aria-pressed={layer.locked}
          className={cn(
            toggle,
            !layer.locked && "opacity-40 hover:opacity-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onChange({ locked: !layer.locked });
          }}
        >
          {layer.locked ? ICONS.locked : ICONS.unlocked}
        </button>

        <span style={{ width: depth * 16 }} className="shrink-0" />
        {layer.kind === "group" ? (
          <button
            type="button"
            title={layer.collapsed ? "Open group" : "Close group"}
            className={toggle}
            onClick={(e) => {
              e.stopPropagation();
              onChange({ collapsed: !layer.collapsed });
            }}
          >
            {layer.collapsed ? ICONS.closed : ICONS.open}
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        {layer.kind === "group" && ICONS.group}
        {layer.kind === "reference" && ICONS.reference}

        {renaming ? (
          <input
            autoFocus
            defaultValue={layer.name}
            maxLength={100}
            aria-label="Layer name"
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => rename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename(e.currentTarget.value);
              if (e.key === "Escape") onRenamingChange(false);
            }}
            className="h-6 min-w-0 flex-1 rounded border bg-background px-1 outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <span
            title="Double-click to rename"
            onDoubleClick={() => onRenamingChange(true)}
            className={cn(
              "min-w-0 flex-1 truncate px-1",
              layer.kind === "background" && "italic",
            )}
          >
            {layer.name}
          </span>
        )}

        {layer.opacity < 255 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.round((layer.opacity / 255) * 100)}%
          </span>
        )}
      </div>
      {children}
    </li>
  );
}
