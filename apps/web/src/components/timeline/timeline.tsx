"use client";

import { useCallback, useState } from "react";
import { ContextMenu } from "@/components/menu/context-menu";
import type { SpriteApi } from "@/components/pixel-canvas/use-sprite";
import { ResizeHandle } from "@/components/resize-handle";
import { panelRows } from "@/lib/layers/tree";
import { frameActions, layerActions } from "./actions";
import { CelStrip } from "./components/cel-strip";
import { FrameHeader } from "./components/frame-header";
import { LayerRow } from "./components/layer-row";
import { TimelineToolbar } from "./components/timeline-toolbar";
import { PANEL_HEIGHT, type DropZone } from "./constants";
import { dropPlace, zoneAt } from "./helpers";
import { ICONS } from "./icons";
import type { Playback } from "./use-playback";

/** An open right-click menu: whose actions, and where. */
type OpenMenu = { of: "layer" | "frame"; x: number; y: number };

/**
 * The timeline under the canvas, as in Aseprite: a row per layer (top layer
 * first) and a column per frame, each cell being that layer's cel in that
 * frame. Layers are shown, locked, renamed and dragged into order or into
 * groups; frames are played, timed and dragged into order. A right-click on
 * a layer or a frame picks it and opens its menu.
 */
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
  const [height, setHeight] = useState(PANEL_HEIGHT.initial);
  const [collapsed, setCollapsed] = useState(false);
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

  // Folded into a small tab at the bottom left, over the workspace.
  if (collapsed)
    return (
      <section aria-label="Timeline" className="relative h-0">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show the timeline"
          className="absolute bottom-0 left-0 z-10 flex items-center gap-2 rounded-tr-md border-t border-r bg-background px-3 py-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase shadow-sm hover:text-foreground"
        >
          {ICONS.expand}
          Timeline
        </button>
      </section>
    );

  return (
    <section
      aria-label="Timeline"
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
      <TimelineToolbar
        sprite={sprite}
        playback={playback}
        onCollapse={() => setCollapsed(true)}
      />

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
