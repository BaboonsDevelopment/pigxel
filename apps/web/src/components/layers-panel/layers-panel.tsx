"use client";

import { useRef, useState } from "react";
import type { LayersApi } from "@/components/pixel-canvas/use-layers";
import { ResizeHandle } from "@/components/resize-handle";
import { fitImageToTile } from "@/lib/image/helpers";
import { panelRows } from "@/lib/layers/tree";
import { LayerOptions } from "./components/layer-options";
import { LayerRow } from "./components/layer-row";
import { PANEL_HEIGHT } from "./constants";
import { dropPlace, zoneAt, type DropZone } from "./helpers";
import { ICONS } from "./icons";

const action =
  "flex h-7 items-center gap-1 rounded-md px-2 text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

/**
 * The layer list under the canvas, top layer first, as in Aseprite: add,
 * remove, show, lock, rename and drag layers into order or into groups.
 */
export function LayersPanel({ layers }: { layers: LayersApi }) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; zone: DropZone } | null>(null);
  const [height, setHeight] = useState(PANEL_HEIGHT.initial);
  const [collapsed, setCollapsed] = useState(false);
  const pictureInput = useRef<HTMLInputElement>(null);
  const rows = panelRows(layers.tree);
  const { active, activeId } = layers;

  const addReference = async (file: File | undefined) => {
    if (!file) return;
    const { w, h } = layers.size;
    layers.add("reference", await fitImageToTile(file, w, h));
  };

  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };

  // Folded into a small tab at the bottom left, over the workspace.
  if (collapsed)
    return (
      <section aria-label="Layers" className="relative h-0">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show the layers"
          className="absolute bottom-0 left-0 z-10 flex items-center gap-2 rounded-tr-md border-t border-r bg-background px-3 py-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase shadow-sm hover:text-foreground"
        >
          {ICONS.expand}
          Layers
        </button>
      </section>
    );

  return (
    <section
      aria-label="Layers"
      style={{ height }}
      className="relative flex shrink-0 flex-col border-t bg-background"
    >
      <ResizeHandle
        edge="top"
        size={height}
        min={PANEL_HEIGHT.min}
        max={PANEL_HEIGHT.max}
        onResize={setHeight}
      />
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-2 py-1">
        <h2 className="px-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Layers
        </h2>
        <div className="flex items-center">
          <button
            type="button"
            className={action}
            onClick={() => layers.add("normal")}
          >
            {ICONS.add} Layer
          </button>
          <button
            type="button"
            className={action}
            onClick={() => layers.add("group")}
          >
            {ICONS.group} Group
          </button>
          <button
            type="button"
            className={action}
            title="A picture to trace over; it isn’t drawn on or exported"
            onClick={() => pictureInput.current?.click()}
          >
            {ICONS.reference} Reference…
          </button>
          <button
            type="button"
            className={action}
            title="Remove layer"
            disabled={!layers.canRemove(activeId)}
            onClick={() => layers.remove(activeId)}
          >
            {ICONS.remove}
          </button>
        </div>
        {active && (
          <LayerOptions
            key={active.id}
            layer={active}
            onChange={(patch) => layers.update(active.id, patch)}
          />
        )}
        <button
          type="button"
          className={`${action} ml-auto text-muted-foreground`}
          title="Hide the layers"
          onClick={() => setCollapsed(true)}
        >
          {ICONS.collapse}
        </button>
        <input
          ref={pictureInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void addReference(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </header>

      <ol
        className="min-h-0 flex-1 overflow-y-auto"
        onDragLeave={() => setOver(null)}
      >
        {rows.map((row) => (
          <LayerRow
            key={row.layer.id}
            row={row}
            active={row.layer.id === activeId}
            drop={over?.id === row.layer.id ? over.zone : null}
            onSelect={() => layers.select(row.layer.id)}
            onChange={(patch) => layers.update(row.layer.id, patch)}
            onDragStart={() => setDragging(row.layer.id)}
            onDragOver={(e) => {
              if (!dragging || dragging === row.layer.id) return;
              e.preventDefault();
              setOver({ id: row.layer.id, zone: zoneAt(e, row) });
            }}
            onDragLeave={() => setOver(null)}
            onDrop={() => {
              if (dragging && over)
                layers.move(dragging, dropPlace(row, over.zone));
              endDrag();
            }}
            onDragEnd={endDrag}
          />
        ))}
      </ol>
    </section>
  );
}
