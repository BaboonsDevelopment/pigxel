"use client";

import { useRef, useState } from "react";
import type { LayersApi } from "@/components/pixel-canvas/use-layers";
import { fitImageToTile } from "@/lib/image/helpers";
import { panelRows } from "@/lib/layers/tree";
import { LayerOptions } from "./components/layer-options";
import { LayerRow } from "./components/layer-row";
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

  return (
    <section
      aria-label="Layers"
      className="flex h-56 shrink-0 flex-col border-t bg-background"
    >
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
