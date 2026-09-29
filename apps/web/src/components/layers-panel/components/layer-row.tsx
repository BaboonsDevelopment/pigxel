"use client";

import { useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { PanelRow } from "@/lib/layers/tree";
import type { DropZone } from "../helpers";
import { ICONS } from "../icons";

type Props = {
  row: PanelRow;
  active: boolean;
  /** The drop zone shown while a layer is dragged over this row. */
  drop: DropZone | null;
  onSelect: () => void;
  onChange: (patch: {
    name?: string;
    visible?: boolean;
    locked?: boolean;
    collapsed?: boolean;
  }) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
};

const toggle =
  "flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground";

/**
 * One layer in the panel: visibility and lock toggles, the group arrow, the
 * name (double-click to rename). Every layer but the Background can be
 * dragged to a new place.
 */
export function LayerRow({
  row,
  active,
  drop,
  onSelect,
  onChange,
  ...drag
}: Props) {
  const { layer, depth } = row;
  const [renaming, setRenaming] = useState(false);
  const movable = layer.kind !== "background";

  const rename = (name: string) => {
    setRenaming(false);
    if (name.trim() && name !== layer.name) onChange({ name: name.trim() });
  };

  return (
    <li
      draggable={movable && !renaming}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        drag.onDragStart();
      }}
      onDragOver={drag.onDragOver}
      onDragLeave={drag.onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        drag.onDrop();
      }}
      onDragEnd={drag.onDragEnd}
      onClick={onSelect}
      className={cn(
        "relative flex h-8 cursor-default items-center gap-1 border-b pr-2 text-sm select-none",
        active ? "bg-primary/10" : "hover:bg-muted/60",
        !layer.visible && "text-muted-foreground",
        drop === "above" && "shadow-[inset_0_2px_0_var(--color-primary)]",
        drop === "below" && "shadow-[inset_0_-2px_0_var(--color-primary)]",
        drop === "into" && "ring-2 ring-primary ring-inset",
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
        className={cn(toggle, !layer.locked && "opacity-40 hover:opacity-100")}
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
            if (e.key === "Escape") setRenaming(false);
          }}
          className="h-6 min-w-0 flex-1 rounded border bg-background px-1 outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <span
          title="Double-click to rename"
          onDoubleClick={() => setRenaming(true)}
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
    </li>
  );
}
