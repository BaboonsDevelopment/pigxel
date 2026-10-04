"use client";

import { useCallback, useState } from "react";
import { ContextMenu } from "../components/menu/context-menu";
import type { SpriteApi } from "../pixel-canvas/use-sprite";
import { panelRows } from "@/lib/layers/tree";
import { frameActions, layerActions } from "./actions";
import { CelStrip } from "./components/cel-strip";
import { FrameHeader } from "./components/frame-header";
import { LayerRow } from "./components/layer-row";
import { LayerPropertiesDialog } from "./components/layer-properties-dialog";
import { TagDialog } from "./components/tag-dialog";
import { LinkCelsDialog } from "./components/link-cels-dialog";
import { CelPropertiesDialog } from "./components/cel-properties-dialog";
import { TimelineToolbar } from "./components/timeline-toolbar";
import { LAYER_COLUMN, type DropZone } from "./constants";
import { dropPlace, zoneAt } from "./helpers";
import { frameRange } from "@/lib/sprite/frames";
import { ICONS } from "./icons";
import { EditorSelect } from "../components/editor-select";
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
  const [propertiesId, setPropertiesId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | "new" | null>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [tagMenu, setTagMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [celMenu, setCelMenu] = useState<{
    layerId: string;
    frameId: string;
    x: number;
    y: number;
  } | null>(null);
  const [linking, setLinking] = useState<{
    layerId: string;
    frameId: string;
  } | null>(null);
  const [celProperties, setCelProperties] = useState<{
    layerId: string;
    frameId: string;
  } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const closeTagMenu = useCallback(() => setTagMenu(null), []);
  const closeCelMenu = useCallback(() => setCelMenu(null), []);
  const rows = panelRows(sprite.tree);
  const { layerId, frameId, frames } = sprite;

  const openMenu = (of: OpenMenu["of"], e: React.MouseEvent) => {
    e.preventDefault();
    setTagMenu(null);
    setCelMenu(null);
    setMenu({ of, x: e.clientX, y: e.clientY });
  };

  const openTagMenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMenu(null);
    setCelMenu(null);
    setTagMenu({
      id,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const duplicateTag = (id: string) => {
    const tag = sprite.tags.find((item) => item.id === id);
    if (!tag) return;
    const names = new Set(sprite.tags.map((item) => item.name.toLowerCase()));
    let name = "";
    for (let number = 1; !name; number++) {
      const suffix = number === 1 ? " copy" : ` copy ${number}`;
      const candidate = `${tag.name.slice(0, 100 - suffix.length).trimEnd()}${suffix}`;
      if (!names.has(candidate.toLowerCase())) name = candidate;
    }
    sprite.saveTag({ ...tag, id: crypto.randomUUID(), name });
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
          <div className="flex h-7 border-b bg-background text-xs">
            <div
              className={`sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r bg-background px-3 ${LAYER_COLUMN}`}
            >
              <span className="mr-auto font-medium text-muted-foreground">
                Tags
              </span>
              <button
                type="button"
                title="New tag"
                aria-label="New tag"
                onClick={() => setEditingTagId("new")}
                className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {ICONS.add}
              </button>
              <EditorSelect
                ariaLabel="Playback range"
                value={playback.tagId ?? ""}
                onChange={(value) => playback.selectTag(value || null)}
                options={[
                  { value: "", label: "All frames" },
                  ...sprite.tags.map((tag) => ({
                    value: tag.id,
                    label: tag.name,
                  })),
                ]}
                className="h-6 w-28 shrink-0 px-2 text-xs"
              />
            </div>
            <div style={{ width: frames.length * 32 }} />
          </div>
          {sprite.tags.map((tag) => (
            <div
              key={tag.id}
              onContextMenu={(e) => openTagMenu(tag.id, e)}
              className="flex h-6 border-b bg-background text-xs"
            >
              <button
                type="button"
                title={`Edit ${tag.name}`}
                onClick={() => setEditingTagId(tag.id)}
                className={`sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r bg-background px-3 text-left hover:bg-muted ${LAYER_COLUMN}`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {tag.name}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {tag.from + 1}–{tag.to + 1}
                </span>
              </button>
              <div className="relative" style={{ width: frames.length * 32 }}>
                <button
                  type="button"
                  title={`${tag.name}: frames ${tag.from + 1}–${tag.to + 1}. Edit tag`}
                  onClick={() => setEditingTagId(tag.id)}
                  aria-label={`Edit ${tag.name} tag`}
                  className="absolute inset-y-1 rounded-sm hover:brightness-110"
                  style={{
                    left: tag.from * 32,
                    width: (tag.to - tag.from + 1) * 32,
                    backgroundColor: tag.color,
                  }}
                />
              </div>
            </div>
          ))}
          <FrameHeader
            frames={frames}
            frameId={frameId}
            selected={sprite.selectedFrames}
            onSelect={(id, e) => {
              if (e.shiftKey)
                return sprite.pickFrames(frameRange(frames, frameId, id));
              if (e.ctrlKey || e.metaKey) {
                if (id === frameId) return;
                const picked = sprite.selectedFrames;
                return sprite.pickFrames(
                  picked.includes(id)
                    ? picked.filter((frame) => frame !== id)
                    : [...picked, id],
                );
              }
              sprite.pickFrames([]);
              sprite.selectFrame(id);
            }}
            onMove={sprite.moveFrame}
            onContextMenu={(id, e) => {
              if (!sprite.selectedFrames.includes(id)) {
                sprite.pickFrames([]);
                sprite.selectFrame(id);
              }
              openMenu("frame", e);
            }}
          />
          <ol onDragLeave={() => setOver(null)}>
            {rows.map((row) => (
              <LayerRow
                key={row.layer.id}
                row={row}
                active={row.layer.id === layerId}
                solo={sprite.soloId === row.layer.id}
                drop={over?.id === row.layer.id ? over.zone : null}
                renaming={renaming === row.layer.id}
                onRenamingChange={(on) => setRenaming(on ? row.layer.id : null)}
                onSelect={() => sprite.selectLayer(row.layer.id)}
                onSolo={() => sprite.toggleSolo(row.layer.id)}
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
                  isLinked={(frame) => sprite.isCelLinked(row.layer.id, frame)}
                  onSelect={(frame) => {
                    sprite.selectLayer(row.layer.id);
                    sprite.selectFrame(frame);
                  }}
                  onContextMenu={(frame, event) => {
                    sprite.selectLayer(row.layer.id);
                    sprite.selectFrame(frame);
                    setMenu(null);
                    setTagMenu(null);
                    setCelMenu({
                      layerId: row.layer.id,
                      frameId: frame,
                      x: event.clientX,
                      y: event.clientY,
                    });
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
              ? layerActions(
                  sprite,
                  () => setRenaming(layerId),
                  () => setPropertiesId(layerId),
                )
              : frameActions(sprite, playback)
          }
          onClose={closeMenu}
        />
      )}
      {tagMenu &&
        (() => {
          const tag = sprite.tags.find((item) => item.id === tagMenu.id);
          return tag ? (
            <ContextMenu
              x={tagMenu.x}
              y={tagMenu.y}
              sections={[
                [
                  { label: "Duplicate", onSelect: () => duplicateTag(tag.id) },
                  { label: "Edit…", onSelect: () => setEditingTagId(tag.id) },
                  {
                    label: "Delete",
                    onSelect: () => {
                      if (playback.tagId === tag.id) playback.selectTag(null);
                      sprite.removeTag(tag.id);
                    },
                  },
                ],
              ]}
              onClose={closeTagMenu}
            />
          ) : null;
        })()}
      {celMenu && (
        <ContextMenu
          x={celMenu.x}
          y={celMenu.y}
          sections={[
            [
              {
                label: "Cel properties…",
                onSelect: () =>
                  setCelProperties({
                    layerId: celMenu.layerId,
                    frameId: celMenu.frameId,
                  }),
              },
              {
                label: "Link cels…",
                onSelect: () =>
                  setLinking({
                    layerId: celMenu.layerId,
                    frameId: celMenu.frameId,
                  }),
                disabled: frames.length < 2,
              },
              {
                label: "Unlink cel",
                onSelect: () =>
                  sprite.unlinkCel(celMenu.layerId, celMenu.frameId),
                disabled: !sprite.isCelLinked(celMenu.layerId, celMenu.frameId),
              },
            ],
          ]}
          onClose={closeCelMenu}
        />
      )}
      {linking && (
        <LinkCelsDialog
          key={`${linking.layerId}:${linking.frameId}`}
          frameCount={frames.length}
          sourceIndex={frames.findIndex(
            (frame) => frame.id === linking.frameId,
          )}
          onApply={(from, to) =>
            sprite.linkCelRange(
              linking.layerId,
              linking.frameId,
              frames.slice(from, to + 1).map((frame) => frame.id),
            )
          }
          onClose={() => setLinking(null)}
        />
      )}
      {celProperties &&
        (() => {
          const layer = rows.find(
            (row) => row.layer.id === celProperties.layerId,
          )?.layer;
          const appearance = sprite.celAppearance(
            celProperties.layerId,
            celProperties.frameId,
          );
          return layer && appearance ? (
            <CelPropertiesDialog
              key={`${celProperties.layerId}:${celProperties.frameId}`}
              layerName={layer.name}
              frameNumber={
                frames.findIndex(
                  (frame) => frame.id === celProperties.frameId,
                ) + 1
              }
              {...appearance}
              onSave={(opacity, zIndex) =>
                sprite.setCelAppearance(
                  celProperties.layerId,
                  celProperties.frameId,
                  opacity,
                  zIndex,
                )
              }
              onClose={() => setCelProperties(null)}
            />
          ) : null;
        })()}
      {propertiesId &&
        (() => {
          const layer = rows.find(
            (row) => row.layer.id === propertiesId,
          )?.layer;
          return layer ? (
            <LayerPropertiesDialog
              key={propertiesId}
              layer={layer}
              onChange={(patch) => sprite.updateLayer(propertiesId, patch)}
              onClose={() => setPropertiesId(null)}
            />
          ) : null;
        })()}
      {editingTagId && (
        <TagDialog
          key={editingTagId}
          tag={sprite.tags.find((tag) => tag.id === editingTagId)}
          tags={sprite.tags}
          frameCount={frames.length}
          initialFrame={frames.findIndex((frame) => frame.id === frameId)}
          onSave={(tag) => {
            if (playback.tagId === tag.id) playback.selectTag(null);
            sprite.saveTag(tag);
          }}
          onDelete={() => {
            if (playback.tagId === editingTagId) playback.selectTag(null);
            sprite.removeTag(editingTagId);
          }}
          onClose={() => setEditingTagId(null)}
        />
      )}
    </section>
  );
}
