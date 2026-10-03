"use client";

import { useCallback, useState } from "react";
import { ContextMenu } from "@/components/menu/context-menu";
import type { SpriteApi } from "@/components/pixel-canvas/use-sprite";
import { panelRows } from "@/lib/layers/tree";
import { frameActions, layerActions } from "./actions";
import { CelStrip } from "./components/cel-strip";
import { FrameHeader } from "./components/frame-header";
import { LayerRow } from "./components/layer-row";
import { TimelineToolbar } from "./components/timeline-toolbar";
import type { DropZone } from "./constants";
import { dropPlace, zoneAt } from "./helpers";
import type { Playback } from "./use-playback";

type OpenMenu = { of: "layer" | "frame"; x: number; y: number };

export function Timeline({
  sprite,
  playback,
}: {
  sprite: SpriteApi;
  playback: Playback;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; zone: DropZone } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const rows = panelRows(sprite.tree);
  const { layerId, frameId, frames } = sprite;

  const openMenu = (of: OpenMenu["of"], e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ of, x: e.clientX, y: e.clientY });
  };

  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };

  return (
    <section
      aria-label="Timeline"
      className="relative flex min-h-0 flex-1 flex-col bg-background"
    >
      <TimelineToolbar sprite={sprite} playback={playback} />

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="w-max min-w-full">
          <FrameHeader
            frames={frames}
            frameId={frameId}
            onSelect={sprite.selectFrame}
            onMove={sprite.moveFrame}
            onContextMenu={(id, e) => {
              sprite.selectFrame(id);
              openMenu("frame", e);
            }}
          />
          <ol onDragLeave={() => setOver(null)}>
            {rows.map((row) => (
              <LayerRow
                key={row.layer.id}
                row={row}
                active={row.layer.id === layerId}
                drop={over?.id === row.layer.id ? over.zone : null}
                renaming={renaming === row.layer.id}
                onRenamingChange={(on) => setRenaming(on ? row.layer.id : null)}
                onSelect={() => sprite.selectLayer(row.layer.id)}
                onChange={(patch) => sprite.updateLayer(row.layer.id, patch)}
                onContextMenu={(e) => {
                  sprite.selectLayer(row.layer.id);
                  openMenu("layer", e);
                }}
                onDragStart={() => setDragging(row.layer.id)}
                onDragOver={(e) => {
                  if (!dragging || dragging === row.layer.id) return;
                  e.preventDefault();
                  setOver({ id: row.layer.id, zone: zoneAt(e, row) });
                }}
                onDragLeave={() => setOver(null)}
                onDrop={() => {
                  if (dragging && over)
                    sprite.moveLayer(dragging, dropPlace(row, over.zone));
                  endDrag();
                }}
                onDragEnd={endDrag}
              >
                <CelStrip
                  layer={row.layer}
                  frames={frames}
                  frameId={frameId}
                  activeLayer={row.layer.id === layerId}
                  hasCel={(frame) => sprite.hasCel(frame, row.layer.id)}
                  onSelect={(frame) => {
                    sprite.selectLayer(row.layer.id);
                    sprite.selectFrame(frame);
                  }}
                />
              </LayerRow>
            ))}
          </ol>
        </div>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          sections={
            menu.of === "layer"
              ? layerActions(sprite, () => setRenaming(layerId))
              : frameActions(sprite, playback)
          }
          onClose={closeMenu}
        />
      )}
    </section>
  );
}
